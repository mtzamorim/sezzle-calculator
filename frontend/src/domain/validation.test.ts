import { describe, expect, it } from 'vitest'
import { validateInputs } from './validation'

describe('validateInputs', () => {
  it('accepts negative values, decimals, scientific notation, and zero', () => {
    expect(validateInputs('add', '-1.25', '2e2')).toEqual({ valid: true, input: { operation: 'add', a: -1.25, b: 200 } })
    expect(validateInputs('multiply', '0', '.5')).toEqual({ valid: true, input: { operation: 'multiply', a: 0, b: 0.5 } })
  })

  it('requires both operands for binary operations', () => {
    expect(validateInputs('add', '', '3')).toMatchObject({ valid: false, field: 'a' })
    expect(validateInputs('add', '3', '')).toMatchObject({ valid: false, field: 'b' })
  })

  it.each(['Infinity', 'NaN', '0x10', '1_000', '12abc', '1e309', ' ', '1,5', '--1', '1e', '1/2'])('rejects %s', (value) => {
    expect(validateInputs('add', value, '5')).toMatchObject({ valid: false, field: 'a' })
  })

  it('rejects division by zero before sending a request', () => {
    expect(validateInputs('divide', '100', '0')).toMatchObject({ valid: false, field: 'b', message: expect.stringContaining('zero') })
  })

  it('accepts square root with one operand and rejects negatives', () => {
    expect(validateInputs('sqrt', '49', '')).toEqual({ valid: true, input: { operation: 'sqrt', a: 49 } })
    expect(validateInputs('sqrt', '-9', '')).toMatchObject({ valid: false, field: 'a' })
  })

  it('models percentage as a percent of a value', () => {
    expect(validateInputs('percent', '20', '250')).toEqual({ valid: true, input: { operation: 'percent', a: 20, b: 250 } })
  })
})
