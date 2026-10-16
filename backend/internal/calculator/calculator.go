// Package calculator contains the pure arithmetic rules and their validation.
// It has no knowledge of HTTP, JSON, or persistence.
package calculator

import (
	"math"
)

// Operation lists the supported arithmetic operations.
type Operation string

const (
	Add        Operation = "add"
	Subtract   Operation = "subtract"
	Multiply   Operation = "multiply"
	Divide     Operation = "divide"
	Power      Operation = "power"
	SquareRoot Operation = "sqrt"
	Percent    Operation = "percent"
)

// Input uses pointers so that missing JSON operands can be distinguished from 0.
type Input struct {
	Operation Operation `json:"operation"`
	A         *float64  `json:"a"`
	B         *float64  `json:"b,omitempty"`
}

// Failure is an expected domain error. The transport layer maps Code to HTTP.
type Failure struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *Failure) Error() string { return e.Message }

func invalid(message string) error   { return &Failure{Code: "invalid_input", Message: message} }
func undefined(message string) error { return &Failure{Code: "math_error", Message: message} }

// Calculate evaluates an operation. Percentage means "a percent of b":
// e.g. (percent, 15, 200) = 30. Square root accepts only a.
func Calculate(in Input) (float64, error) {
	switch in.Operation {
	case Add, Subtract, Multiply, Divide, Power, SquareRoot, Percent:
	default:
		return 0, &Failure{Code: "unsupported_operation", Message: "Unsupported operation."}
	}

	if in.A == nil {
		return 0, invalid("The first operand (a) is required.")
	}
	a := *in.A
	if math.IsNaN(a) || math.IsInf(a, 0) {
		return 0, invalid("The first operand (a) must be a finite number.")
	}

	if in.Operation == SquareRoot {
		if in.B != nil {
			return 0, invalid("Square root accepts only the first operand (a).")
		}
		if a < 0 {
			return 0, undefined("Cannot calculate the square root of a negative number.")
		}
		return math.Sqrt(a), nil
	}

	if in.B == nil {
		return 0, invalid("The second operand (b) is required.")
	}
	b := *in.B
	if math.IsNaN(b) || math.IsInf(b, 0) {
		return 0, invalid("The second operand (b) must be a finite number.")
	}

	var result float64
	switch in.Operation {
	case Add:
		result = a + b
	case Subtract:
		result = a - b
	case Multiply:
		result = a * b
	case Divide:
		if b == 0 {
			return 0, undefined("Division by zero is not allowed.")
		}
		result = a / b
	case Power:
		result = math.Pow(a, b)
	case Percent:
		result = a / 100 * b
	}

	if math.IsNaN(result) || math.IsInf(result, 0) {
		return 0, undefined("The result is not a finite real number.")
	}
	return result, nil
}
