import { useEffect, useRef, useState, type FormEvent } from 'react'
import { calculate, CalculatorApiError, type CalculationResponse } from '../api/calculator'
import { formatExpression, formatNumber } from '../domain/format'
import { getOperation, OPERATIONS, type Operation } from '../domain/operations'
import { validateInputs } from '../domain/validation'

type Field = 'a' | 'b'
type FieldErrors = Partial<Record<Field, string>>
type HistoryEntry = CalculationResponse & { id: number }

const HISTORY_LIMIT = 5

export function Calculator() {
  const [operation, setOperation] = useState<Operation>('add')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CalculationResponse | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const activeRequest = useRef<AbortController | null>(null)
  const firstInput = useRef<HTMLInputElement>(null)
  const secondInput = useRef<HTMLInputElement>(null)
  const historyId = useRef(0)
  const activeOperation = getOperation(operation)

  useEffect(() => () => {
    activeRequest.current?.abort()
    activeRequest.current = null
  }, [])

  function clearFeedback() {
    activeRequest.current?.abort()
    activeRequest.current = null
    setResult(null)
    setApiError('')
    setFieldErrors({})
    setIsLoading(false)
  }

  function selectOperation(nextOperation: Operation) {
    setOperation(nextOperation)
    clearFeedback()
  }

  function updateOperand(field: Field, value: string) {
    if (field === 'a') setA(value)
    else setB(value)
    clearFeedback()
  }

  function resetInputs() {
    setOperation('add')
    setA('')
    setB('')
    clearFeedback()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (activeRequest.current) return // A ref also blocks two submissions in the same render.
    clearFeedback()

    const parsed = validateInputs(operation, a, b)
    if (!parsed.valid) {
      setFieldErrors({ [parsed.field]: parsed.message })
      const invalidInput = parsed.field === 'a' ? firstInput : secondInput
      invalidInput.current?.focus()
      return
    }

    const currentRequest = new AbortController()
    activeRequest.current = currentRequest
    setIsLoading(true)
    try {
      const data = await calculate(parsed.input, { signal: currentRequest.signal })
      if (activeRequest.current !== currentRequest) return
      setResult(data)
      const newEntryId = ++historyId.current
      setHistory((previous) => [{ ...data, id: newEntryId }, ...previous].slice(0, HISTORY_LIMIT))
    } catch (error) {
      if (activeRequest.current !== currentRequest) return
      setApiError(error instanceof CalculatorApiError ? error.message : 'Something went wrong. Please try again.')
    } finally {
      if (activeRequest.current === currentRequest) {
        activeRequest.current = null
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div>
          <span className="section-eyebrow">YOUR WORKSPACE</span>
          <h2>Let's do the math.</h2>
        </div>
        <span className="workspace-tag"><span className="tag-dot" /> Ready to calculate</span>
      </div>

      <div className="workspace-grid">
        <section className="calculator-panel" aria-labelledby="calc-title">
          <div className="panel-heading">
            <div className="panel-icon" aria-hidden="true">⌘</div>
            <div>
              <h3 id="calc-title">Calculator</h3>
              <p>Choose an operation to get started.</p>
            </div>
            <span className="panel-index">01 / 02</span>
          </div>

          <div className="operation-selector">
            <div className="operation-label"><span>Basic operations</span><span className="operation-count">04</span></div>
            <div className="operation-grid basic-grid" role="group" aria-label="Basic operations">
              {OPERATIONS.filter((item) => item.group === 'basic').map((item) => (
                <button
                  key={item.id}
                  className={`operation-button ${operation === item.id ? 'selected' : ''}`}
                  type="button"
                  aria-label={item.label}
                  aria-pressed={operation === item.id}
                  onClick={() => selectOperation(item.id)}
                >{item.symbol}</button>
              ))}
            </div>
            <div className="operation-label advanced-label"><span>Advanced operations</span><span className="operation-count">03</span></div>
            <div className="operation-grid advanced-grid" role="group" aria-label="Advanced operations">
              {OPERATIONS.filter((item) => item.group === 'advanced').map((item) => (
                <button
                  key={item.id}
                  className={`operation-button ${operation === item.id ? 'selected' : ''}`}
                  type="button"
                  aria-label={item.label}
                  aria-pressed={operation === item.id}
                  onClick={() => selectOperation(item.id)}
                >{item.symbol}</button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} noValidate aria-busy={isLoading}>
            <div className="form-divider" />
            <div className="form-heading">
              <div><h4>{activeOperation.label}</h4><p>{activeOperation.description}</p></div>
              <span className="active-symbol" aria-hidden="true">{activeOperation.symbol}</span>
            </div>
            <div className="operand-fields">
              <div className="input-group">
                <label htmlFor="operand-a">{operation === 'percent' ? 'Percentage (%)' : 'First number'}</label>
                <div className={`field-frame ${fieldErrors.a ? 'has-error' : ''}`}>
                  <span className="field-prefix">A</span>
                  <input
                    ref={firstInput}
                    required
                    id="operand-a"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="e.g. 125.50"
                    value={a}
                    onChange={(event) => updateOperand('a', event.target.value)}
                    aria-invalid={Boolean(fieldErrors.a)}
                    aria-describedby={fieldErrors.a ? 'operand-a-error' : undefined}
                  />
                </div>
                {fieldErrors.a && <p className="field-error" id="operand-a-error" role="alert">{fieldErrors.a}</p>}
              </div>
              {activeOperation.needsSecondOperand && (
                <div className="input-group">
                  <label htmlFor="operand-b">{operation === 'percent' ? 'Value to calculate from' : operation === 'power' ? 'Exponent' : 'Second number'}</label>
                  <div className={`field-frame ${fieldErrors.b ? 'has-error' : ''}`}>
                    <span className="field-prefix">B</span>
                    <input
                      ref={secondInput}
                      required
                      id="operand-b"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="e.g. 25"
                      value={b}
                      onChange={(event) => updateOperand('b', event.target.value)}
                      aria-invalid={Boolean(fieldErrors.b)}
                      aria-describedby={fieldErrors.b ? 'operand-b-error' : undefined}
                    />
                  </div>
                  {fieldErrors.b && <p className="field-error" id="operand-b-error" role="alert">{fieldErrors.b}</p>}
                </div>
              )}
            </div>
            {apiError && <div className="api-error" role="alert"><span aria-hidden="true">!</span>{apiError}</div>}
            <div className="form-actions">
              <button type="button" className="reset-button" onClick={resetInputs}>Clear inputs</button>
              <button type="submit" className="submit-button" disabled={isLoading}>
                <span>{isLoading ? 'Calculating…' : 'Calculate result'}</span>
                <span className="submit-arrow" aria-hidden="true">↗</span>
              </button>
            </div>
            <p className="keyboard-tip">Tip: press <kbd>Enter</kbd> to calculate</p>
          </form>
        </section>

        <aside className="result-column" aria-label="Results and history">
          <section className="result-panel" aria-label="Latest result">
            <div className="result-top"><span className="result-eyebrow">LIVE RESULT</span><span className="result-pulse" aria-hidden="true" /></div>
            <div className="result-main" aria-live="polite" aria-atomic="true">
              <span className="result-caption">{result ? 'Your answer' : 'Ready when you are'}</span>
              <output aria-label="Calculation result" className={`result-number ${!result ? 'result-placeholder' : ''}`}>
                {result ? formatNumber(result.result) : '—'}
              </output>
              <span className="result-expression">{result ? formatExpression(result.operation, result.a, result.b) : 'Your result will appear here'}</span>
            </div>
            <div className="result-bottom"><span className="verified-mark">✓</span><span>Computed by the Go API</span></div>
          </section>

          <section className="history-panel" aria-label="Recent calculations">
            <div className="history-heading">
              <div><h3>Recent calculations</h3><p>Your last five results in this session.</p></div>
              {history.length > 0 && <button className="history-clear" type="button" aria-label="Clear calculation history" onClick={() => setHistory([])}>Clear</button>}
            </div>
            {history.length === 0 ? (
              <div className="history-empty">
                <span className="history-empty-icon" aria-hidden="true">↺</span>
                <p>Nothing here yet.</p>
                <span>Your calculations will be saved here as you go.</span>
              </div>
            ) : (
              <ol className="history-list">
                {history.map((entry) => (
                  <li key={entry.id} className="history-item">
                    <span className="history-operation" aria-hidden="true">{getOperation(entry.operation).symbol}</span>
                    <span className="history-expression">{formatExpression(entry.operation, entry.a, entry.b)}</span>
                    <strong className="history-answer">{formatNumber(entry.result)}</strong>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <div className="api-footnote"><span aria-hidden="true">◇</span><span>Stateless backend. Your history stays in this tab.</span></div>
        </aside>
      </div>
    </div>
  )
}
