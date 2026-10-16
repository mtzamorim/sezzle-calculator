import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculate, CalculatorApiError, type CalculationResponse } from '../api/calculator'
import type { Operation } from '../domain/operations'
import { Calculator } from './Calculator'

vi.mock('../api/calculator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/calculator')>()
  return { ...actual, calculate: vi.fn() }
})

const mockedCalculate = vi.mocked(calculate)

beforeEach(() => {
  // Returning the mock would register it as a Vitest cleanup callback.
  mockedCalculate.mockReset()
})

async function enterOperands(user: ReturnType<typeof userEvent.setup>, a: string, b: string) {
  await user.type(screen.getByLabelText('First number'), a)
  await user.type(screen.getByLabelText('Second number'), b)
}

describe('Calculator', () => {
  it.each<{ operation: Operation; label: string; a: number; b?: number; result: number; expression: string }>([
    { operation: 'add', label: 'Addition', a: 10, b: 5, result: 15, expression: '10 + 5' },
    { operation: 'subtract', label: 'Subtraction', a: 10, b: 5, result: 5, expression: '10 − 5' },
    { operation: 'multiply', label: 'Multiplication', a: 10, b: 5, result: 50, expression: '10 × 5' },
    { operation: 'divide', label: 'Division', a: 10, b: 5, result: 2, expression: '10 ÷ 5' },
    { operation: 'power', label: 'Exponentiation', a: 2, b: 3, result: 8, expression: '2 ^ 3' },
    { operation: 'sqrt', label: 'Square root', a: 81, result: 9, expression: '√(81)' },
    { operation: 'percent', label: 'Percentage', a: 15, b: 200, result: 30, expression: '15% of 200' },
  ])('submits $operation to the API and displays its result and history', async ({ operation, label, a, b, result, expression }) => {
    const input = b === undefined ? { operation, a } : { operation, a, b }
    mockedCalculate.mockResolvedValue({ ...input, result })
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: label }))
    const fields = screen.getAllByRole('textbox')
    expect(fields).toHaveLength(b === undefined ? 1 : 2)
    await user.type(fields[0], String(a))
    if (b !== undefined) await user.type(fields[1], String(b))
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    expect(mockedCalculate).toHaveBeenCalledTimes(1)
    expect(mockedCalculate).toHaveBeenCalledWith(input, { signal: expect.any(AbortSignal) })
    // The output exists before the request resolves; wait for its content instead.
    await waitFor(() => expect(screen.getByLabelText('Calculation result')).toHaveTextContent(String(result)))
    expect(within(screen.getByRole('list')).getByText(expression)).toBeInTheDocument()
  })

  it('shows inline validation and never calls the API for missing values', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid, finite number')
    expect(screen.getByLabelText('First number')).toHaveAttribute('aria-invalid', 'true')
    expect(mockedCalculate).not.toHaveBeenCalled()
  })

  it('uses a single operand for square root and validates negative inputs', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: 'Square root' }))
    expect(screen.queryByLabelText('Second number')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('First number'), '-4')
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    expect(screen.getByRole('alert')).toHaveTextContent('non-negative')
    expect(mockedCalculate).not.toHaveBeenCalled()
  })

  it('rejects zero divisors before hitting the API', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: 'Division' }))
    await enterOperands(user, '8', '0')
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Division by zero')
    expect(mockedCalculate).not.toHaveBeenCalled()
  })

  it('exposes API errors and clears them when the user edits an input', async () => {
    mockedCalculate.mockRejectedValue(new CalculatorApiError('math_error', 'The result is not a finite real number.', 422))
    const user = userEvent.setup()
    render(<Calculator />)
    await enterOperands(user, '2', '3')
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('not a finite real number')
    await user.type(screen.getByLabelText('First number'), '4')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the five most recent results in order and lets the user clear history', async () => {
    mockedCalculate.mockImplementation(async (request) => ({ ...request, result: request.a + (request.b ?? 0) }))
    const user = userEvent.setup()
    render(<Calculator />)
    await user.type(screen.getByLabelText('Second number'), '2')
    for (let a = 1; a <= 6; a++) {
      await user.clear(screen.getByLabelText('First number'))
      await user.type(screen.getByLabelText('First number'), String(a))
      await user.click(screen.getByRole('button', { name: 'Calculate result' }))
      await waitFor(() => expect(screen.getByLabelText('Calculation result')).toHaveTextContent(String(a + 2)))
    }
    const history = within(screen.getByRole('list'))
    const entries = history.getAllByRole('listitem')
    expect(entries).toHaveLength(5)
    entries.forEach((entry, index) => {
      expect(within(entry).getByText(`${6 - index} + 2`)).toBeInTheDocument()
    })
    expect(history.queryByText('1 + 2')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear calculation history' }))
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument()
    expect(screen.getByLabelText('Calculation result')).toHaveTextContent('8')
  })

  it('ignores a stale response after inputs change', async () => {
    let resolveRequest!: (result: CalculationResponse) => void
    mockedCalculate.mockReturnValue(new Promise<CalculationResponse>((resolve) => { resolveRequest = resolve }))
    const user = userEvent.setup()
    render(<Calculator />)
    await enterOperands(user, '1', '2')
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    expect(screen.getByRole('button', { name: 'Calculating…' })).toBeDisabled()
    await user.type(screen.getByLabelText('First number'), '3')
    await act(async () => resolveRequest({ operation: 'add', a: 1, b: 2, result: 3 }))
    expect(screen.getByLabelText('Calculation result')).toHaveTextContent('—')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('allows Enter to submit the form and reset inputs', async () => {
    mockedCalculate.mockResolvedValue({ operation: 'add', a: 3, b: 7, result: 10 })
    const user = userEvent.setup()
    render(<Calculator />)
    await enterOperands(user, '3', '7')
    await user.type(screen.getByLabelText('Second number'), '{Enter}')
    await waitFor(() => expect(screen.getByLabelText('Calculation result')).toHaveTextContent('10'))
    await user.click(screen.getByRole('button', { name: 'Clear inputs' }))
    expect(screen.getByLabelText('First number')).toHaveValue('')
    expect(screen.getByLabelText('Second number')).toHaveValue('')
    expect(screen.getByLabelText('Calculation result')).toHaveTextContent('—')
  })

  it('does not submit the same calculation twice while a request is pending', async () => {
    let resolveRequest!: (result: CalculationResponse) => void
    mockedCalculate.mockReturnValue(new Promise<CalculationResponse>((resolve) => { resolveRequest = resolve }))
    const user = userEvent.setup()
    render(<Calculator />)
    await enterOperands(user, '4', '2')
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    const button = screen.getByRole('button', { name: 'Calculating…' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(mockedCalculate).toHaveBeenCalledTimes(1)
    await act(async () => resolveRequest({ operation: 'add', a: 4, b: 2, result: 6 }))
    expect(screen.getByLabelText('Calculation result')).toHaveTextContent('6')
    expect(screen.getByRole('button', { name: 'Calculate result' })).toBeEnabled()
  })

  it('shows a safe fallback for unexpected errors and allows a retry', async () => {
    mockedCalculate.mockRejectedValueOnce(new Error('Internal implementation detail'))
      .mockResolvedValueOnce({ operation: 'add', a: 4, b: 2, result: 6 })
    const user = userEvent.setup()
    render(<Calculator />)
    await enterOperands(user, '4', '2')
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(screen.queryByText('Internal implementation detail')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    await waitFor(() => expect(screen.getByLabelText('Calculation result')).toHaveTextContent('6'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each(['Clear inputs', 'Square root'])('ignores an obsolete error after clicking %s', async (buttonName) => {
    let rejectRequest!: (error: Error) => void
    mockedCalculate.mockReturnValue(new Promise<CalculationResponse>((_, reject) => { rejectRequest = reject }))
    const user = userEvent.setup()
    render(<Calculator />)
    await enterOperands(user, '4', '2')
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    await user.click(screen.getByRole('button', { name: buttonName }))
    await act(async () => rejectRequest(new CalculatorApiError('network_error', 'Obsolete request failure', 0)))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Calculation result')).toHaveTextContent('—')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Calculate result' })).toBeEnabled()
  })


  it('focuses the first invalid field, then the second invalid field', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    expect(screen.getByLabelText('First number')).toHaveFocus()
    await user.type(screen.getByLabelText('First number'), '2')
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    expect(screen.getByLabelText('Second number')).toHaveFocus()
    expect(mockedCalculate).not.toHaveBeenCalled()
  })

  it('aborts network work when an operand changes and when the component unmounts', async () => {
    mockedCalculate.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    const { unmount } = render(<Calculator />)
    await enterOperands(user, '2', '3')
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    const firstSignal = mockedCalculate.mock.calls[0][1]?.signal
    expect(firstSignal?.aborted).toBe(false)
    await user.type(screen.getByLabelText('First number'), '4')
    expect(firstSignal?.aborted).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    const secondSignal = mockedCalculate.mock.calls[1][1]?.signal
    unmount()
    expect(secondSignal?.aborted).toBe(true)
  })

  it('guards programmatic form resubmission while waiting for the API', async () => {
    mockedCalculate.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<Calculator />)
    await enterOperands(user, '2', '3')
    const form = screen.getByRole('button', { name: 'Calculate result' }).closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(mockedCalculate).toHaveBeenCalledTimes(1)
  })

  it('keeps the newest response when an older response resolves afterwards', async () => {
    let resolveOld!: (result: CalculationResponse) => void
    mockedCalculate.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve }))
      .mockResolvedValueOnce({ operation: 'add', a: 4, b: 2, result: 6 })
    const user = userEvent.setup()
    render(<Calculator />)
    await enterOperands(user, '1', '2')
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    await user.clear(screen.getByLabelText('First number'))
    await user.type(screen.getByLabelText('First number'), '4')
    await user.click(screen.getByRole('button', { name: 'Calculate result' }))
    await waitFor(() => expect(screen.getByLabelText('Calculation result')).toHaveTextContent('6'))
    await act(async () => resolveOld({ operation: 'add', a: 1, b: 2, result: 3 }))
    expect(screen.getByLabelText('Calculation result')).toHaveTextContent('6')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })
})
