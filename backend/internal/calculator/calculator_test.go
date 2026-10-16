package calculator

import (
	"math"
	"testing"
)

func ptr(v float64) *float64 { return &v }

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		name      string
		operation Operation
		a         float64
		b         *float64
		want      float64
	}{
		{"addition", Add, 2, ptr(3), 5},
		{"decimal addition", Add, 0.1, ptr(0.2), 0.3},
		{"subtraction", Subtract, 2, ptr(7), -5},
		{"multiplication", Multiply, -3, ptr(4), -12},
		{"division", Divide, 7, ptr(2), 3.5},
		{"exponentiation", Power, 2, ptr(3), 8},
		{"negative exponent", Power, 2, ptr(-1), 0.5},
		{"square root", SquareRoot, 81, nil, 9},
		{"square root of zero", SquareRoot, 0, nil, 0},
		{"percentage", Percent, 15, ptr(200), 30},
		{"zero to zero follows math.Pow", Power, 0, ptr(0), 1},
		{"negative percentage", Percent, -10, ptr(200), -20},
		{"percentage over one hundred", Percent, 125, ptr(200), 250},
		{"negative denominator", Divide, 10, ptr(-2), -5},
		{"fractional exponent", Power, 9, ptr(0.5), 3},
		{"zero operand", Multiply, 0, ptr(8), 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual, err := Calculate(Input{Operation: tt.operation, A: ptr(tt.a), B: tt.b})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if math.Abs(actual-tt.want) > 1e-12 {
				t.Errorf("Calculate() = %v, want %v", actual, tt.want)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	tests := []struct {
		name  string
		input Input
		code  string
	}{
		{"unknown operation", Input{Operation: "log", A: ptr(1), B: ptr(1)}, "unsupported_operation"},
		{"missing a", Input{Operation: Add, B: ptr(1)}, "invalid_input"},
		{"missing b", Input{Operation: Add, A: ptr(1)}, "invalid_input"},
		{"missing b for percentage", Input{Operation: Percent, A: ptr(1)}, "invalid_input"},
		{"sqrt rejects b", Input{Operation: SquareRoot, A: ptr(1), B: ptr(2)}, "invalid_input"},
		{"sqrt negative", Input{Operation: SquareRoot, A: ptr(-1)}, "math_error"},
		{"division by zero", Input{Operation: Divide, A: ptr(1), B: ptr(0)}, "math_error"},
		{"power of negative fractional", Input{Operation: Power, A: ptr(-1), B: ptr(0.5)}, "math_error"},
		{"multiplication overflow", Input{Operation: Multiply, A: ptr(1e308), B: ptr(1e308)}, "math_error"},
		{"negative zero divisor", Input{Operation: Divide, A: ptr(1), B: ptr(math.Copysign(0, -1))}, "math_error"},
		{"zero to negative power", Input{Operation: Power, A: ptr(0), B: ptr(-1)}, "math_error"},
		{"addition overflow", Input{Operation: Add, A: ptr(1e308), B: ptr(1e308)}, "math_error"},
		{"a is NaN", Input{Operation: Add, A: ptr(math.NaN()), B: ptr(2)}, "invalid_input"},
		{"b is infinite", Input{Operation: Add, A: ptr(2), B: ptr(math.Inf(1))}, "invalid_input"},
		{"a is infinite", Input{Operation: SquareRoot, A: ptr(math.Inf(-1))}, "invalid_input"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Calculate(tt.input)
			f, ok := err.(*Failure)
			if !ok || f.Code != tt.code {
				t.Fatalf("got %v, want code %s", err, tt.code)
			}
		})
	}
}

func TestFailureError(t *testing.T) {
	err := &Failure{Code: "invalid_input", Message: "Invalid operand"}
	if err.Error() != "Invalid operand" {
		t.Errorf("Error() = %q", err.Error())
	}
}

// Fuzz seeds run in ordinary go test. Fuzzing checks that all accepted results
// remain JSON-encodable finite numbers, without imposing decimal precision.
func FuzzCalculateFiniteResult(f *testing.F) {
	f.Add(uint8(0), 1.0, 2.0)
	f.Add(uint8(3), 1.0, 0.0)
	f.Add(uint8(4), -1.0, 0.5)
	f.Add(uint8(5), 81.0, 0.0)
	operations := []Operation{Add, Subtract, Multiply, Divide, Power, SquareRoot, Percent}
	f.Fuzz(func(t *testing.T, op uint8, a, b float64) {
		input := Input{Operation: operations[int(op)%len(operations)], A: &a, B: &b}
		if input.Operation == SquareRoot {
			input.B = nil
		}
		result, err := Calculate(input)
		if err != nil {
			if _, ok := err.(*Failure); !ok {
				t.Fatalf("unexpected error type: %T", err)
			}
			return
		}
		if math.IsNaN(result) || math.IsInf(result, 0) {
			t.Fatalf("non-finite result: %v", result)
		}
	})
}
