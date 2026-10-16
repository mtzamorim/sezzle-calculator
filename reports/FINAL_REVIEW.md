# Final Requirements and Source Review

## Scope and conclusion

Reviewed source: `sezzle-calculator-with-reviewer-setup.zip`, including the frontend,
backend, tests, CI, Dockerfile, and reviewer documentation. This review compares the
source against the Sezzle assignment supplied by the candidate.

The required functionality is represented in the implementation. No additional product
feature was identified as necessary to satisfy the assignment. Submission readiness is
still conditional on the React test suite, full TypeScript/Vite build, frontend coverage,
interactive browser checks, and remote repository publication. This report does not
predict or guarantee a hiring decision.

## Fix included in this revision

`frontend/src/components/Calculator.test.tsx` previously contained:

```ts
beforeEach(() => mockedCalculate.mockReset())
```

The expression returns the callable mock. Vitest supports a function returned from
`beforeEach` as an after-test cleanup callback. That makes the mock eligible to be
invoked again during teardown, without the calculation input. Rejected or pending mock
implementations can consequently cause teardown errors or timeouts unrelated to the
assertions. This is a source-review finding grounded in the Vitest v3 contract, not an
observed execution of the complete Vitest suite in this environment.

The corrected hook resets the mock without returning it:

```ts
beforeEach(() => {
  // Returning the mock would register it as a Vitest cleanup callback.
  mockedCalculate.mockReset()
})
```

References: https://v3.vitest.dev/api/#beforeeach and
https://v3.vitest.dev/api/mock#mockreset .

The original manifest also had an outdated README hash. `MANIFEST.sha256` was regenerated
for the complete revised source tree, including the reviewer setup guide. The frontend
application, styles, API, arithmetic rules, and dependency versions were not changed.

## Requirement matrix

| Assignment requirement | Implementation | Verification status |
| --- | --- | --- |
| React frontend; TypeScript preferred | `frontend/src/App.tsx`, `components/Calculator.tsx`, strict TS config | Present; full React runtime/build checks pending |
| Go backend microservice | `backend/cmd/server`, `internal/httpapi`, `internal/calculator` | Fresh tests and binary build passed |
| Frontend consumes backend API | `frontend/src/api/calculator.ts` uses POST `/api/v1/calculate` | Real client/core checks passed; React UI integration pending |
| Addition, subtraction, multiplication, division | Domain operations and corresponding UI buttons | Go unit tests and real HTTP calls passed |
| Optional exponentiation, square root, percentage | All three present, including unary square root and documented percentage semantics | Go unit tests and real HTTP calls passed |
| Intuitive input and result interface | Operation selector, operand labels, output, inline errors, loading, clear controls, history | Source and static layout inspected; interactivity not certified |
| Basic mobile support | Responsive CSS at 880 px and 630 px | Static layout inspected at 320, 390, 820, and 1440 px; actual device review pending |
| Input validation and error handling | Independent frontend and backend validation; typed API errors | Backend and standalone frontend-core checks passed |
| REST endpoints and JSON responses | Health and calculation endpoints; JSON error contract | Real HTTP smoke checks passed |
| Clean, maintainable, testable code | Separated domain, transport, and UI; no database or extra framework | Qualitative source assessment, not a hiring guarantee |
| Unit tests for both layers | Go tests plus Vitest domain/client/component tests | Go passed; Vitest execution pending after hook fix |
| Coverage report | Backend reports present; frontend V8 reporters configured | Backend total 82.7%; frontend report still must be generated |
| README setup, running instructions, API examples, decisions | `README.md` and `docs/GETTING_STARTED.md` | Present and checked against scripts/configuration |
| Optional Docker packaging | Multi-stage Dockerfile, Compose, non-root runtime | Files inspected; image not built or run here |
| Git repository and shared URL | Source includes CI and publishing instructions | Candidate must publish and share the accessible repository URL |
| Share AI prompts | `AI_USAGE.md`, translated task-related prompts | Present and extended for this review; candidate should check accuracy |
| Approximately 2-4 hours and five-business-day deadline | Process constraints, not source-code features | Actual candidate time and receipt-based deadline were not independently verified |

The assignment does not require a numeric keypad, a database, user authentication,
multiple application screens, or a publicly hosted live demo. The existing operand-based
single-screen design is consistent with the described requirements. An operation parameter
on one calculation endpoint avoids duplicating validation across seven routes.

## Checks rerun during this review

| Check | Outcome |
| --- | --- |
| Go formatting | Passed |
| `go vet ./...` | Passed |
| Fresh Go unit/HTTP/lifecycle tests with race detector | Passed |
| Go binary build | Passed |
| Backend coverage, including the server entrypoint | 82.7% |
| Arithmetic domain statement coverage | 100.0% |
| HTTP API statement coverage | 96.3% |
| Real HTTP smoke requests | Seven operations and representative error cases passed |
| Strict typecheck of the four standalone frontend domain/API modules | Passed |
| Supplemental Node checks of those real modules | 41 passed, 0 failed |
| npm dependency installation | Bounded attempt did not complete; exit 124 |
| `npm run verify` | Stopped before running tests: `vitest: not found`, exit 127 |
| Full frontend build | Not completed; the combined verification stopped at missing Vitest |
| React/Vitest coverage | Not generated |
| Project Playwright/axe suite | Not executed |
| Docker and remote CI | Not executed |

Runtime: Go 1.23.2, Node.js 22.16.0, npm 10.9.2. The supplemental standalone TypeScript
check used the available global compiler, not an installed complete frontend toolchain.
Logs from the fresh checks are included in `reports/final-review-evidence/`.

The 41 standalone checks are not 41 React component tests. They exercise the real
validation, formatting, and API-client modules, including live Go requests and timeout
handling. They do not establish Vitest coverage, React behavior, or a Vite build.

## Static visual review: explicit limitations

Static markup was generated from the actual JSX and CSS with an audit-only renderer.
Hook values were supplied for initial, result, validation-error, and extreme-number
states. Chromium rendered that HTML at 320, 390, 820, and 1440 px. All 16 sampled
combinations had no document-level horizontal overflow and no sampled core panel/input/
result element extending beyond the viewport. Desktop, mobile, and narrow-screen error
screenshots were visually inspected.

This is a CSS/layout inspection only. It does not mount React, execute event handlers,
prove that clicking computes a result, reproduce the Vite production build, or constitute
a passing run of the project's Playwright/axe suite. Values visible in static result
screenshots were supplied to the renderer; they are not evidence of a browser calculation.
Actual browser/device behavior, focus interactions, zoom, and automated accessibility
checks remain to be verified through the real application.

The source contains all seven operation controls, first/second operand fields, conditional
unary layout, result output, inline/API errors, loading feedback, clear controls, and
five-item session history. No required screen or control was found missing in this review.
The mobile layout is a vertical stack; seeing the result can require scrolling below the
form. That is a usability trade-off, not a missing assignment requirement.

## Candidate submission gate

From the corrected project root, after installing Node.js 22.12+ and Go and with npm
network access:

```bash
node scripts/verify.mjs --install --e2e
```

Stop any existing server on port 8080 first: the project's Playwright configuration starts
its own server and intentionally does not reuse an unrelated process. On Linux the
Chromium system dependencies may need `npx playwright install --with-deps chromium`
from `frontend/`. Add `--race` only when a C compiler/CGO toolchain is available.

After a successful run:

1. Commit the generated `frontend/package-lock.json` and measured `reports/COVERAGE.md`.
2. Confirm the real React application works on desktop and a narrow/mobile viewport.
3. Update README/verification status with the actual results instead of leaving old
   statements that frontend verification is pending.
4. Publish the repository; check the backend, frontend, and Docker CI jobs.
5. Share the repository URL and AI prompt disclosure within the requested deadline.

Do not claim complete test coverage, a green CI run, Docker success, or a particular
assignment duration unless supported by actual execution and records. No new feature is
recommended before completing these checks.
