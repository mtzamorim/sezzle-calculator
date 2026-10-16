package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func perform(method, path, body, contentType string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	recorder := httptest.NewRecorder()
	NewHandler().ServeHTTP(recorder, req)
	return recorder
}

func TestCalculateHTTP(t *testing.T) {
	tests := []struct {
		name, body, contentType string
		status                  int
		wantCode                string
	}{
		{"addition", `{"operation":"add","a":12,"b":4}`, "application/json", 200, ""},
		{"sqrt unary", `{"operation":"sqrt","a":16}`, "application/json", 200, ""},
		{"decimal zero", `{"operation":"add","a":0,"b":0}`, "application/json", 200, ""},
		{"charset content type", `{"operation":"percent","a":25,"b":120}`, "application/json; charset=utf-8", 200, ""},
		{"division by zero", `{"operation":"divide","a":3,"b":0}`, "application/json", 422, "math_error"},
		{"negative sqrt", `{"operation":"sqrt","a":-9}`, "application/json", 422, "math_error"},
		{"overflow", `{"operation":"multiply","a":1e308,"b":1e308}`, "application/json", 422, "math_error"},
		{"unknown operation", `{"operation":"nope","a":1,"b":2}`, "application/json", 400, "unsupported_operation"},
		{"operand missing", `{"operation":"add","a":1}`, "application/json", 400, "invalid_input"},
		{"null operand", `{"operation":"add","a":null,"b":2}`, "application/json", 400, "invalid_input"},
		{"string operand", `{"operation":"add","a":"1","b":2}`, "application/json", 400, "invalid_json"},
		{"unknown field", `{"operation":"add","a":1,"b":2,"extra":true}`, "application/json", 400, "invalid_json"},
		{"malformed", `{"operation":`, "application/json", 400, "invalid_json"},
		{"trailing JSON", `{"operation":"add","a":1,"b":2}{}`, "application/json", 400, "invalid_json"},
		{"null body", `null`, "application/json", 400, "invalid_json"},
		{"array body", `[]`, "application/json", 400, "invalid_json"},
		{"non-numeric boolean", `{"operation":"add","a":true,"b":2}`, "application/json", 400, "invalid_json"},
		{"out-of-range input", `{"operation":"add","a":1e309,"b":2}`, "application/json", 400, "invalid_json"},
		{"extra sqrt operand", `{"operation":"sqrt","a":9,"b":2}`, "application/json", 400, "invalid_input"},
		{"null optional sqrt operand", `{"operation":"sqrt","a":9,"b":null}`, "application/json", 200, ""},
		{"trailing garbage", `{"operation":"add","a":1,"b":2}x`, "application/json", 400, "invalid_json"},
		{"oversized trailing whitespace", `{"operation":"add","a":1,"b":2}` + strings.Repeat(" ", 17000), "application/json", 413, "payload_too_large"},
		{"allowed trailing whitespace", `{"operation":"add","a":1,"b":2}  `, "application/json", 200, ""},
		{"empty body", ``, "application/json", 400, "invalid_json"},
		{"wrong media type", `{"operation":"add","a":1,"b":2}`, "text/plain", 415, "unsupported_media_type"},
		{"missing media type", `{"operation":"add","a":1,"b":2}`, "", 415, "unsupported_media_type"},
		{"oversized body", `{"operation":"add","a":1,"b":2,"x":"` + strings.Repeat("x", 17000) + `"}`, "application/json", 413, "payload_too_large"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := perform(http.MethodPost, "/api/v1/calculate", tt.body, tt.contentType)
			if response.Code != tt.status {
				t.Fatalf("status = %d, want %d; %s", response.Code, tt.status, response.Body.String())
			}
			if got := response.Header().Get("Content-Type"); !strings.Contains(got, "application/json") {
				t.Errorf("Content-Type = %s", got)
			}
			var payload map[string]any
			if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
				t.Fatalf("invalid response JSON: %v", err)
			}
			if tt.wantCode == "" {
				if _, ok := payload["result"].(float64); !ok {
					t.Errorf("result missing: %v", payload)
				}
				if payload["operation"] == "sqrt" && payload["b"] != nil {
					t.Errorf("unary response contains b: %v", payload)
				}
			} else {
				got := payload["error"].(map[string]any)["code"]
				if got != tt.wantCode {
					t.Errorf("error code = %v, want %s", got, tt.wantCode)
				}
			}
		})
	}
}

func TestHealth(t *testing.T) {
	response := perform(http.MethodGet, "/api/v1/health", "", "")
	if response.Code != http.StatusOK || strings.TrimSpace(response.Body.String()) != `{"status":"ok"}` {
		t.Fatalf("unexpected health response: %d %s", response.Code, response.Body.String())
	}
}

func TestMethodNotAllowed(t *testing.T) {
	response := perform(http.MethodGet, "/api/v1/calculate", "", "")
	if response.Code != http.StatusMethodNotAllowed {
		t.Errorf("got %d, want 405", response.Code)
	}
	if got := response.Header().Get("Allow"); got != "POST" {
		t.Errorf("Allow = %q", got)
	}
}

func TestSuccessResponseContract(t *testing.T) {
	tests := []struct {
		operation  string
		a, b, want float64
	}{
		{"add", 12, 4, 16}, {"subtract", 12, 4, 8}, {"multiply", 12, 4, 48},
		{"divide", 12, 4, 3}, {"power", 2, 4, 16}, {"percent", 15, 200, 30},
	}
	for _, tc := range tests {
		t.Run(tc.operation, func(t *testing.T) {
			body, err := json.Marshal(map[string]any{"operation": tc.operation, "a": tc.a, "b": tc.b})
			if err != nil {
				t.Fatal(err)
			}
			res := perform("POST", "/api/v1/calculate", string(body), "application/json")
			var actual calculationResponse
			if err := json.Unmarshal(res.Body.Bytes(), &actual); err != nil {
				t.Fatal(err)
			}
			if res.Code != 200 || string(actual.Operation) != tc.operation || actual.A != tc.a || actual.B == nil || *actual.B != tc.b || actual.Result != tc.want {
				t.Fatalf("unexpected response: %d %s", res.Code, res.Body.String())
			}
		})
	}
}

func TestAPIHeadersAndRouting(t *testing.T) {
	tests := []struct {
		method, path string
		status       int
		allow        string
	}{
		{"HEAD", "/api/v1/health", 200, ""},
		{"POST", "/api/v1/health", 405, "GET, HEAD"},
		{"DELETE", "/api/v1/calculate", 405, "POST"},
		{"GET", "/api/v1/missing", 404, ""},
		{"GET", "/api", 404, ""},
	}
	for _, tc := range tests {
		t.Run(tc.method+tc.path, func(t *testing.T) {
			res := perform(tc.method, tc.path, "", "")
			if res.Code != tc.status {
				t.Fatalf("status=%d, want %d", res.Code, tc.status)
			}
			if res.Header().Get("Allow") != tc.allow {
				t.Fatal("incorrect Allow header")
			}
			if res.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("response must not be cached")
			}
			if res.Header().Get("X-Content-Type-Options") != "nosniff" {
				t.Fatal("missing nosniff")
			}
			if !strings.HasPrefix(res.Header().Get("Content-Type"), "application/json") {
				t.Fatal("API response must be JSON")
			}
			if tc.status >= 400 {
				var payload errorResponse
				if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
					t.Fatal(err)
				}
				if payload.Error == nil || payload.Error.Code == "" || payload.Error.Message == "" {
					t.Fatal("invalid error envelope")
				}
			}
		})
	}
}
