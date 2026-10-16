import { OPERATIONS } from '../domain/operations'
import type { CalculationInput } from '../domain/validation'

export interface CalculationResponse {
  operation: CalculationInput['operation']
  a: number
  b?: number
  result: number
}

export class CalculatorApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message)
    this.name = 'CalculatorApiError'
  }
}

interface RequestOptions {
  signal?: AbortSignal
  fetcher?: typeof fetch
}

export const REQUEST_TIMEOUT_MS = 10_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCalculationResponse(value: unknown, input: CalculationInput): value is CalculationResponse {
  if (!isRecord(value)) return false
  return OPERATIONS.some(({ id }) => id === value.operation) &&
    value.operation === input.operation &&
    typeof value.a === 'number' && Number.isFinite(value.a) && value.a === input.a &&
    typeof value.result === 'number' && Number.isFinite(value.result) &&
    (input.operation === 'sqrt'
      ? value.b === undefined
      : typeof value.b === 'number' && Number.isFinite(value.b) && value.b === input.b)
}

// Validate the runtime payload, not just its TypeScript assertion. A successful
// response must also echo this request; otherwise the UI could show the wrong math.
export async function calculate(input: CalculationInput, { signal, fetcher = fetch }: RequestOptions = {}): Promise<CalculationResponse> {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  if (signal?.aborted) {
    throw new CalculatorApiError('cancelled', 'The calculation was cancelled.', 0)
  }
  signal?.addEventListener('abort', cancel, { once: true })
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const response = await fetcher('/api/v1/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    })

    let data: unknown
    try {
      data = await response.json()
    } catch {
      throw new CalculatorApiError('invalid_response', 'The server returned an unreadable response.', response.status)
    }

    // A custom transport may finish despite cancellation; never accept that result.
    controller.signal.throwIfAborted()
    if (!response.ok) {
      const error = isRecord(data) && isRecord(data.error) ? data.error : null
      throw new CalculatorApiError(
        typeof error?.code === 'string' ? error.code : 'request_failed',
        typeof error?.message === 'string' ? error.message : 'Calculation failed. Please try again.',
        response.status,
      )
    }
    if (!isCalculationResponse(data, input)) {
      throw new CalculatorApiError('invalid_response', 'The server returned an unexpected result.', response.status)
    }
    return data
  } catch (error) {
    if (timedOut) {
      throw new CalculatorApiError('timeout', 'The server took too long to respond. Please try again.', 0)
    }
    if (signal?.aborted) {
      throw new CalculatorApiError('cancelled', 'The calculation was cancelled.', 0)
    }
    if (error instanceof CalculatorApiError) throw error
    throw new CalculatorApiError('network_error', 'Unable to reach the calculator server. Please try again.', 0)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}
