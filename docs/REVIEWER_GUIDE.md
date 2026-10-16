# Reviewer walkthrough

## Start with evidence

Read `reports/VERIFICATION.md`. It distinguishes executed checks from authored tests.
Run `node scripts/verify.mjs --install --e2e` from the project root. This requires npm
network access and stops at the first failure. A successfully generated lockfile must be
committed before the strict CI/Docker path can work.

## Explore the application

1. Add 12 and 8. The result should be 20 and appear in recent calculations. The network
   panel should show a numeric JSON POST to `/api/v1/calculate`; arithmetic is not local.
2. Select square root. Only one operand remains. Enter 81 and expect 9. Then try -1 and
   confirm the inline error and focus on the first operand.
3. Try 15 percent of 200 and expect 30. The labels should explain which value is the rate.
4. Divide by zero. The UI should reject it without a request. Send the same JSON directly
   to the API and expect a 422 error, proving the backend does not trust frontend validation.
5. Multiply `1e308` by `1e308`. Both inputs are finite, but the result is not; the real
   backend should return a safe math error. Correct the inputs and retry without reloading.
6. Use browser offline mode and retry a calculation. A readable network error should
   appear. Turn networking back on and retry successfully.
7. Submit using Enter, navigate with the skip link/keyboard, narrow the viewport and inspect
   error messages. Clear history and verify that the current result is preserved. Refresh
   and observe that the in-memory history is intentionally gone.

## Read the smallest useful code path

`Calculator.submit` -> `validateInputs` -> `api.calculate` -> HTTP handler ->
`calculator.Calculate` -> validated JSON response -> result/history state.

The calculator domain has no HTTP dependency. The API client has no React dependency.
The component does not implement arithmetic. Tests can replace transport without a
production-only flag; browser tests use the real backend and production assets.

## Trade-offs worth discussing

- Why a single calculation endpoint rather than seven duplicated handlers?
- Why `float64`, and why is display rounding not the same as exact decimal arithmetic?
- Why validate on both sides and validate the response as well?
- How do cancellation, a bounded timeout, request identity and duplicate-submit guards
  solve different asynchronous problems?
- Why use Go's standard library, no database and no global state library?
- What does coverage fail to prove? What do browser emulation and automated accessibility
  scans fail to prove?

The scope deliberately avoids an enterprise framework around four required operations.
Optional operations and small quality checks support the requested calculator rather than
introducing unrelated features. No claim about actual time spent or hiring outcome is made.
