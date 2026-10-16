import { describe, expect, it } from 'vitest'
import { formatExpression, formatNumber } from './format'
import { getOperation, OPERATIONS } from './operations'

describe('result presentation', () => {
  it('formats ordinary numbers without floating-point noise', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
    expect(formatNumber(12345.5)).toBe('12,345.5')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(-0)).toBe('0')
  })

  it('preserves very small and very large magnitudes', () => {
    expect(formatNumber(1e-12)).toBe('1.000000e-12')
    expect(formatNumber(1e15)).toBe('1.000000e+15')
  })

  it('explains expressions, including unary and percentage', () => {
    expect(formatExpression('add', 10, 2)).toBe('10 + 2')
    expect(formatExpression('sqrt', 9)).toBe('√(9)')
    expect(formatExpression('percent', 15, 200)).toBe('15% of 200')
    expect(formatExpression('power', 2, 5)).toBe('2 ^ 5')
  })

  it('defines seven distinct operations', () => {
    expect(new Set(OPERATIONS.map(({ id }) => id)).size).toBe(7)
    expect(getOperation('divide').symbol).toBe('÷')
  })
})
