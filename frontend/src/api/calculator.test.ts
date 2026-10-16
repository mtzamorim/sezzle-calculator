import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculate, CalculatorApiError, REQUEST_TIMEOUT_MS } from './calculator'

const input = { operation: 'add' as const, a: 7, b: 4 }
function fetchReturns(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body }) as typeof fetch
}
function hangingFetch(): typeof fetch {
  return vi.fn((_url: RequestInfo | URL, options?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })) as typeof fetch
}

afterEach(() => vi.useRealTimers())

describe('calculator REST client', () => {
  it('POSTs numeric JSON and returns a validated response', async () => {
    const fetcher = fetchReturns({ ...input, result: 11 })
    await expect(calculate(input, { fetcher })).resolves.toEqual({ ...input, result: 11 })
    expect(fetcher).toHaveBeenCalledWith('/api/v1/calculate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input), signal: expect.any(AbortSignal),
    })
  })

  it('accepts a unary response without inventing a second operand', async () => {
    const request = { operation: 'sqrt' as const, a: 81 }
    await expect(calculate(request, { fetcher: fetchReturns({ ...request, result: 9 }) })).resolves.toEqual({ ...request, result: 9 })
  })

  it.each([
    null, [], '11', {},
    { ...input, result: '11' }, { ...input, result: Infinity }, { ...input, result: NaN },
    { ...input, result: 11, operation: 'log' }, { ...input, result: 11, operation: 'multiply' },
    { ...input, result: 11, a: 8 }, { ...input, result: 11, a: '7' }, { ...input, result: 11, a: NaN },
    { ...input, result: 11, b: 5 }, { ...input, result: 11, b: undefined },
    { ...input, result: 11, b: null }, { ...input, result: 11, b: Infinity },
  ])('rejects malformed or mismatched success payload %#', async (body) => {
    await expect(calculate(input, { fetcher: fetchReturns(body) })).rejects.toMatchObject({ code: 'invalid_response', status: 200 })
  })

  it('rejects an unexpected second operand on a square root response', async () => {
    const request = { operation: 'sqrt' as const, a: 9 }
    await expect(calculate(request, { fetcher: fetchReturns({ ...request, b: 1, result: 3 }) })).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('preserves structured API errors', async () => {
    await expect(calculate(input, { fetcher: fetchReturns({ error: { code: 'math_error', message: 'Division by zero is not allowed.' } }, 422) }))
      .rejects.toMatchObject({ name: 'CalculatorApiError', code: 'math_error', status: 422, message: 'Division by zero is not allowed.' })
  })

  it.each([null, [], { unexpected: 'error' }, { error: null }, { error: { code: 1, message: {} } }])('safely handles invalid error envelope %#', async (body) => {
    await expect(calculate(input, { fetcher: fetchReturns(body, 500) })).rejects.toMatchObject({
      code: 'request_failed', status: 500, message: 'Calculation failed. Please try again.',
    })
  })

  it('rejects a non-JSON response', async () => {
    const fetcher = vi.fn().mockResolvedValue({ status: 502, json: async () => { throw new SyntaxError('Invalid JSON') } }) as typeof fetch
    await expect(calculate(input, { fetcher })).rejects.toMatchObject({ code: 'invalid_response', status: 502 })
  })

  it('does not expose raw network errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Internal networking detail')) as typeof fetch
    await expect(calculate(input, { fetcher })).rejects.toBeInstanceOf(CalculatorApiError)
    await expect(calculate(input, { fetcher })).rejects.toMatchObject({ code: 'network_error', status: 0 })
  })

  it('times out a request and clears its timer', async () => {
    vi.useFakeTimers()
    const assertion = expect(calculate(input, { fetcher: hangingFetch() })).rejects.toMatchObject({ code: 'timeout', status: 0 })
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    await assertion
    expect(vi.getTimerCount()).toBe(0)
  })

  it('also bounds the response body, not only the response headers', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn((_url: RequestInfo | URL, options?: RequestInit) => Promise.resolve({
      ok: true, status: 200,
      json: () => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('Aborted')))),
    })) as unknown as typeof fetch
    const assertion = expect(calculate(input, { fetcher })).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    await assertion
  })

  it('cancels an active request when the caller aborts', async () => {
    const controller = new AbortController()
    const assertion = expect(calculate(input, { fetcher: hangingFetch(), signal: controller.signal })).rejects.toMatchObject({ code: 'cancelled' })
    controller.abort()
    await assertion
  })

  it('does not send an already-cancelled request', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetcher = fetchReturns({ ...input, result: 11 })
    await expect(calculate(input, { fetcher, signal: controller.signal })).rejects.toMatchObject({ code: 'cancelled' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects a late success even when the transport ignores cancellation', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn(async () => {
      controller.abort()
      return { ok: true, status: 200, json: async () => ({ ...input, result: 11 }) }
    }) as unknown as typeof fetch
    await expect(calculate(input, { signal: controller.signal, fetcher })).rejects.toMatchObject({ code: 'cancelled' })
  })

  it('cleans up its timer and caller listener after success', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const remove = vi.spyOn(controller.signal, 'removeEventListener')
    await calculate(input, { signal: controller.signal, fetcher: fetchReturns({ ...input, result: 11 }) })
    expect(vi.getTimerCount()).toBe(0)
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
  })
})
