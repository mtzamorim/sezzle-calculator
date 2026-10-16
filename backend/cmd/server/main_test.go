package main

import (
	"io"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/matheusAmorim123/sezzle-calculator/backend/internal/httpapi"
)

func TestWithFrontend(t *testing.T) {
	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, "assets"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "index.html"), []byte("<h1>SPA</h1>"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "assets", "main.js"), []byte("console.log('ok')"), 0644); err != nil {
		t.Fatal(err)
	}

	handler := withFrontend(httpapi.NewHandler(), root)
	checks := []struct {
		name, method, path string
		status             int
		text               string
	}{
		{"homepage", "GET", "/", 200, "SPA"},
		{"spa fallback", "GET", "/a/client/route", 200, "SPA"},
		{"js asset", "GET", "/assets/main.js", 200, "console.log"},
		{"API not shadowed", "GET", "/api/v1/health", 200, `"ok"`},
		{"missing API stays 404", "GET", "/api/notfound", 404, "not_found"},
		{"API root stays JSON", "GET", "/api", 404, "not_found"},
		{"missing JS stays 404", "GET", "/assets/missing.js", 404, "404"},
		{"missing CSS stays 404", "GET", "/missing.css", 404, "404"},
		{"static POST rejected", "POST", "/", 405, "Method not allowed"},
	}
	for _, tc := range checks {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			raw, err := io.ReadAll(res.Body)
			if err != nil {
				t.Fatal(err)
			}
			if res.Code != tc.status || !strings.Contains(string(raw), tc.text) {
				t.Fatalf("status=%d body=%q; wanted %d %q", res.Code, raw, tc.status, tc.text)
			}
		})
	}
}
