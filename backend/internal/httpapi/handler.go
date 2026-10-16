// Package httpapi exposes the calculator through a small JSON REST API.
package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"strings"

	"github.com/matheusAmorim123/sezzle-calculator/backend/internal/calculator"
)

const maxRequestBody = 16 << 10 // 16 KiB, including trailing whitespace.

type calculationResponse struct {
	Operation calculator.Operation `json:"operation"`
	A         float64              `json:"a"`
	B         *float64             `json:"b,omitempty"`
	Result    float64              `json:"result"`
}

type errorResponse struct {
	Error *calculator.Failure `json:"error"`
}

// NewHandler returns an HTTP handler suitable for httptest or http.Server.
func NewHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/health", allowMethods([]string{"GET", "HEAD"}, func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}))
	mux.HandleFunc("/api/v1/calculate", allowMethods([]string{"POST"}, calculate))
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusNotFound, "not_found", "The requested API endpoint does not exist.")
	})
	return mux
}

func allowMethods(allowed []string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		for _, method := range allowed {
			if r.Method == method {
				next(w, r)
				return
			}
		}
		w.Header().Set("Allow", strings.Join(allowed, ", "))
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "The HTTP method is not supported for this endpoint.")
	}
}

func calculate(w http.ResponseWriter, r *http.Request) {
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		writeError(w, http.StatusUnsupportedMediaType, "unsupported_media_type", "Content-Type must be application/json.")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBody)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	var input *calculator.Input
	if err := decoder.Decode(&input); err != nil {
		writeDecodeError(w, err)
		return
	}
	if input == nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be a JSON object.")
		return
	}
	// Check the second read too: an otherwise valid object followed by more than
	// 16 KiB of whitespace is still an oversized request, not a different 400 error.
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		writeDecodeError(w, err)
		return
	}
	result, err := calculator.Calculate(*input)
	if err != nil {
		var failure *calculator.Failure
		if errors.As(err, &failure) {
			status := http.StatusBadRequest
			if failure.Code == "math_error" {
				status = http.StatusUnprocessableEntity
			}
			writeJSON(w, status, errorResponse{Error: failure})
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "Unable to complete the calculation.")
		return
	}
	writeJSON(w, http.StatusOK, calculationResponse{Operation: input.Operation, A: *input.A, B: input.B, Result: result})
}

func writeDecodeError(w http.ResponseWriter, err error) {
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		writeError(w, http.StatusRequestEntityTooLarge, "payload_too_large", "The request body exceeds 16 KiB.")
		return
	}
	writeError(w, http.StatusBadRequest, "invalid_json", "Request body must contain exactly one JSON object with numeric operands.")
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: &calculator.Failure{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
