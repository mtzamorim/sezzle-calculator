# Frontend test strategy

## Unit and component tests: Vitest + React Testing Library

Run `npm run coverage` in `frontend`. The local dependency install must succeed first.
The jsdom environment is selected by Vite configuration. Globals are disabled;
`src/test/setup.ts` explicitly calls `afterEach(cleanup)` and imports the jest-dom matchers.

- Validation: empty/malformed numbers, decimal and scientific input, finite values,
  unary input and zero-divisor/negative-root errors.
- Formatting: ordinary values, negative zero, scientific notation and expressions.
- REST client: correct POST body, finite/known/echoed response data, malformed success/error
  bodies, HTTP errors, network failures, cancellation and ten-second timeouts, including
  delayed response bodies. Timers/listeners are cleaned up.
- Calculator: all seven operations, input errors, error recovery, Enter, bounded history,
  disabled submission, same-render duplicate submission, stale results/errors, abort on
  edit/unmount and focus on invalid fields.
- App: the real page composition exposes the intended content and calculator.

Mocks isolate behavior at the HTTP-client boundary. They are not evidence that the real
backend returns a compatible response; that is the integration layer's responsibility.

## Production browser tests: Playwright + axe

Run `npm run build`, `npm run install:browsers`, then `npm run test:e2e` in `frontend`.
The root verification script can run those steps with `--e2e`.

The Playwright server is the actual Go process serving `frontend/dist`, not a mocked API
or a static screenshot. All seven operations check the numeric POST, real JSON response,
visible result and history. Additional tests cover zero-division request suppression,
backend overflow recovery, offline recovery, keyboard behavior, history clearing,
viewport fit and screenshots. Axe checks initial, invalid and successful states.

There are 13 scenarios defined for two Chromium projects (desktop and mobile viewport),
for 26 executions when the suite runs. Retries are zero: a flaky failure is not silently
converted into a success. Failure traces/screenshots and HTML/JSON reports are retained.
The mobile project does not certify iOS/Safari. Automated axe checks cannot prove full
accessibility; keyboard/screen-reader review remains useful.

## Coverage and verification

V8 reports include `App`, `Calculator`, and all domain/client source. Only test/setup
files and `main.tsx` (DOM mounting) are excluded. There is no unmeasured percentage target
and no source exclusion intended to inflate coverage. Reports are written to
`reports/frontend-coverage/` after a successful run.

The preparation runtime could not install npm dependencies. Vitest, the full typecheck,
Vite build and browser tests are **not claimed to have passed**. Supplemental Node checks
compiled the actual standalone TypeScript domain/client modules and ran 41 checks,
including calls to the live Go API. Those are useful evidence, not React/Vitest coverage.
See `reports/VERIFICATION.md` for exact commands and limitations.
