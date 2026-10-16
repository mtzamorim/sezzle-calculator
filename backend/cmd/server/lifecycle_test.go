package main

import (
	"context"
	"io"
	"net"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestServeDrainsInFlightRequestBeforeReturning(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	entered, release, shutdown := make(chan struct{}), make(chan struct{}), make(chan struct{})
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(entered)
		<-release
		_, _ = io.WriteString(w, "finished")
	})}
	server.RegisterOnShutdown(func() { close(shutdown) })
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	defer server.Close()
	done := make(chan error, 1)
	go func() { done <- serve(ctx, server, listener) }()
	response := make(chan string, 1)
	go func() {
		client := &http.Client{Timeout: 3 * time.Second}
		res, err := client.Get("http://" + listener.Addr().String())
		if err != nil {
			response <- err.Error()
			return
		}
		defer res.Body.Close()
		body, err := io.ReadAll(res.Body)
		if err != nil {
			response <- err.Error()
			return
		}
		response <- string(body)
	}()
	select {
	case <-entered:
	case <-time.After(3 * time.Second):
		close(release)
		t.Fatal("request never reached handler")
	}
	cancel()
	select {
	case <-shutdown:
	case <-time.After(3 * time.Second):
		close(release)
		t.Fatal("shutdown never started")
	}
	select {
	case err := <-done:
		close(release)
		t.Fatalf("serve returned before draining the request: %v", err)
	default:
	}
	close(release)
	select {
	case body := <-response:
		if body != "finished" {
			t.Fatalf("response = %q", body)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("client did not receive the completed response")
	}
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("serve did not stop")
	}
}

func TestServeReturnsListenerFailure(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	_ = listener.Close()
	err = serve(context.Background(), &http.Server{}, listener)
	if err == nil || !strings.Contains(err.Error(), "closed") {
		t.Fatalf("expected listener error, got %v", err)
	}
}

func TestServeAlreadyClosedServer(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	server := &http.Server{}
	_ = server.Close()
	if err := serve(context.Background(), server, listener); err != nil {
		t.Fatal(err)
	}
}
