import { getOperation, type Operation } from './operations'

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 })

export function formatNumber(value: number): string {
  if (Object.is(value, -0)) return '0'
  const magnitude = Math.abs(value)
  if (magnitude !== 0 && (magnitude < 1e-10 || magnitude >= 1e12)) {
    return value.toExponential(6)
  }
  return formatter.format(value)
}

export function formatExpression(operation: Operation, a: number, b?: number): string {
  if (operation === 'sqrt') return `√(${formatNumber(a)})`
  if (operation === 'percent') return `${formatNumber(a)}% of ${formatNumber(b ?? 0)}`
  if (operation === 'power') return `${formatNumber(a)} ^ ${formatNumber(b ?? 0)}`
  return `${formatNumber(a)} ${getOperation(operation).symbol} ${formatNumber(b ?? 0)}`
}
