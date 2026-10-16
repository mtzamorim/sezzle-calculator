import type { Operation } from './operations'

export interface CalculationInput {
  operation: Operation
  a: number
  b?: number
}

export type ValidationResult =
  | { valid: true; input: CalculationInput }
  | { valid: false; field: 'a' | 'b'; message: string }

// Only decimal/scientific notation; Number('') and Number('0x10') are intentionally rejected.
const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

function parseOperand(raw: string): number | null {
  const value = raw.trim()
  if (!NUMBER_PATTERN.test(value)) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function validateInputs(operation: Operation, rawA: string, rawB: string): ValidationResult {
  const a = parseOperand(rawA)
  if (a === null) {
    return { valid: false, field: 'a', message: 'Enter a valid, finite number.' }
  }

  if (operation === 'sqrt') {
    if (a < 0) {
      return { valid: false, field: 'a', message: 'Square root needs a non-negative number.' }
    }
    return { valid: true, input: { operation, a } }
  }

  const b = parseOperand(rawB)
  if (b === null) {
    return { valid: false, field: 'b', message: 'Enter a valid, finite number.' }
  }

  if (operation === 'divide' && b === 0) {
    return { valid: false, field: 'b', message: 'Division by zero is not allowed.' }
  }
  return { valid: true, input: { operation, a, b } }
}
