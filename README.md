# Clarity - Full-Stack Calculator

> **New reviewer?** Start with [Getting Started — Reviewer Setup and Verification](docs/GETTING_STARTED.md) for installation, local execution, API smoke tests, coverage, E2E tests, Docker, and troubleshooting.


A React + TypeScript interface backed by a small Go REST service. **All arithmetic runs
on the server**; the browser validates input, sends the request, and displays the result.

Seven operations, explicit failure states, and a deliberately small architecture. There
is no database, authentication, expression parser, or unnecessary backend framework.

**Verification status:** Go tests, race detection, fuzzing, live HTTP checks, and 41
supplemental checks of the actual frontend domain/API modules passed in the preparation
runtime. **React/Vitest, the production frontend build, browser tests, and Docker have not
been executed successfully here**. npm downloads are blocked, and Docker is unavailable. No passing badge,
frontend coverage percentage, or dependency lockfile is fabricated. See the complete
[verification report](reports/VERIFICATION.md) before submitting this project.

## Start here

| Need | Location |
| --- | --- |
| Evaluate the application and decisions | [Reviewer walkthrough](docs/REVIEWER_GUIDE.md) |
| Check every assignment requirement | [Requirement matrix](docs/REQUIREMENTS.md) |
| Inspect the REST contract | [OpenAPI 3.1](docs/openapi.yaml), [HTTP examples](docs/api.http) |
| Understand the test strategy | [Frontend tests](docs/FRONTEND_TESTS.md) |
| Review AI assistance and prompts | [AI disclosure](AI_USAGE.md) |
| Check outstanding delivery steps | [Submission checklist](docs/SUBMISSION_CHECKLIST.md) |

## Prerequisites

Node.js 22.12 or later (Node 22 is selected by `.nvmrc`), npm, and Go 1.23 or later.
Use supported patch versions in your environment. CI selects Node 22 and Go 1.27.2;
the recorded local Go verification used Go 1.23.2, **not** the CI runtime.

Initial setup requires access to the npm registry. Browser tests also require a Chromium
download. Docker is optional. Race-enabled Go tests require a C compiler.

## One-command verification

From the project root:

```bash
node scripts/verify.mjs --install --e2e
```

The script runs Go formatting, vet, unit/HTTP tests and coverage, builds the Go binary,
generates a missing npm lockfile through a real install, performs a clean `npm ci`, runs
Vitest coverage, checks TypeScript, builds the frontend, installs Chromium, and runs
Playwright against the production assets served by the real Go backend. It stops at the
first failure and writes individual command logs and exit codes to `reports/local-verification/`.
It does not publish the project or certify Docker/remote CI.

**The package does not yet contain `frontend/package-lock.json`: npm access was blocked.**
Commit the file produced by the successful setup. Subsequent verification uses:

```bash
node scripts/verify.mjs --e2e
```

Add `--race` when a C compiler is available. To check only the backend:

```bash
node scripts/verify.mjs --backend-only --race
```

On Linux, Playwright may also require system libraries. Install them with
`cd frontend && npx playwright install --with-deps chromium` in an environment where you
can install OS packages. Stop other processes using port 8080 before browser tests; the
runner intentionally refuses to reuse an unrelated service.

## Run locally

**Terminal 1:**

```bash
cd backend
go run ./cmd/server
```

**Terminal 2**, after installing dependencies:

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`. Vite proxies `/api` to the Go server at port 8080. Opening
`frontend/index.html` directly is not supported.

| Configuration | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8080` | Go listening port |
| `STATIC_DIR` | unset | Optional compiled frontend directory |
| Vite proxy target | `http://127.0.0.1:8080` | Backend during development |
| `API_URL` | `http://127.0.0.1:8080` | Target for `scripts/smoke-api.mjs` |

Changing the Go port requires updating the Vite proxy for local development. For example,
`PORT=9090 go run ./cmd/server` on a POSIX shell; on PowerShell set `$env:PORT='9090'` first.
The development server binds loopback by default. For an intentional trusted-LAN phone
check, run `npm run dev -- --host 0.0.0.0` and visit the computer's LAN address on port 5173.
Do not expose the development server publicly.

## Operations and API

`GET /api/v1/health` returns `{"status":"ok"}`. Calculations use
`POST /api/v1/calculate` with `Content-Type: application/json`.

| `operation` | Meaning | Example | Result |
| --- | --- | --- | --- |
| `add` | a + b | 12, 8 | 20 |
| `subtract` | a - b | 12, 8 | 4 |
| `multiply` | a * b | -3, 4 | -12 |
| `divide` | a / b | 7, 2 | 3.5 |
| `power` | a raised to b | 2, 3 | 8 |
| `sqrt` | Principal square root of a | 81 | 9 |
| `percent` | a percent of b | 15, 200 | 30 |

```bash
curl http://localhost:8080/api/v1/health

curl -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"add","a":12,"b":8}'
# {"operation":"add","a":12,"b":8,"result":20}

curl -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"sqrt","a":81}'
# {"operation":"sqrt","a":81,"result":9}

curl -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"percent","a":15,"b":200}'
# {"operation":"percent","a":15,"b":200,"result":30}
```

Examples use POSIX quoting; Windows users can use Git Bash or `Invoke-RestMethod`.
The [OpenAPI file](docs/openapi.yaml) documents request/response schemas and examples
without requiring a Swagger server or introducing a runtime dependency.

### Error contract

```json
{"error":{"code":"math_error","message":"Division by zero is not allowed."}}
```

| HTTP status | Codes | Meaning |
| --- | --- | --- |
| 400 | `invalid_json`, `invalid_input`, `unsupported_operation` | Malformed JSON, extra fields, invalid/missing operands, unknown operation |
| 404 | `not_found` | Unknown API path |
| 405 | `method_not_allowed` | Unsupported method; includes `Allow` |
| 413 | `payload_too_large` | More than 16 KiB, including oversized trailing input |
| 415 | `unsupported_media_type` | Content type is not JSON |
| 422 | `math_error` | Zero divisor, negative square root, undefined/non-finite real result |
| 500 | `internal_error` | Unexpected internal failure; implementation details are not exposed |

Application API errors use JSON and `Cache-Control: no-store`. Static files are served
separately; a missing JavaScript/CSS asset returns 404, not SPA HTML. Go's router may
canonicalize malformed URL paths with a redirect before the application handler.

## Design decisions and boundaries

**Separation of concerns.** `internal/calculator` contains pure arithmetic and validation;
`internal/httpapi` maps JSON/HTTP to it. React separates domain parsing/formatting, a typed
HTTP client, and UI state. There is no global state library or shared database to configure.

**Server-authoritative results.** The frontend never substitutes a local calculation for
an unavailable backend. TypeScript types alone cannot validate network data, so the
client checks known operations, finite numbers, and echoed operands before displaying a
response. A response for a different request is rejected.

**Predictable asynchronous behavior.** Requests time out after 10 seconds, including body
reading. Editing an operand, changing the operation, clearing inputs, or unmounting aborts
obsolete work. Controller identity prevents a late response from overwriting newer state.
A synchronous ref blocks duplicate submissions; the UI also disables the submit button.

**Useful accessibility basics.** Named operation buttons, associated labels, required-field
semantics, inline announced errors, focus on invalid fields, Enter submission, a skip link,
visible focus, reduced motion support, and responsive layouts are implemented. The axe
suite is a regression aid, not a claim of complete accessibility certification.

**Numbers and assumptions.** Go `float64` and JavaScript `number` use binary floating point.
The API preserves that result; the UI rounds presentation to at most ten fractional digits
and uses scientific notation for extremes. For example `0.1 + 0.2` can return
`0.30000000000000004` and display `0.3`. This is not a financial decimal-precision engine.
`0^0` follows `math.Pow` and returns 1. Complex results are unsupported; underflow may
round to zero. Percentage means `(a / 100) * b`, not remainder or percentage change.
Square root takes only `a`; an explicitly null `b` is treated as absent by JSON decoding.
Binary operations require two finite JSON numbers, not strings. Decimal/scientific input
is accepted in the UI; decimal commas, hex, NaN and Infinity are not.

**Bounded scope.** History is the five newest successful calculations in the current tab's
React state. Refreshing discards it. No user accounts, database, cross-tab synchronization,
complex expression parsing, or analytics are included. The optional Go static host avoids
a separate web proxy and a permissive CORS policy. Go waits for active requests during
shutdown, with a 10-second deadline. This exercise is not a public multi-tenant service:
TLS termination, infrastructure rate limiting and operational monitoring belong outside
this small demonstration.

## Tests and generated evidence

| Layer | Purpose | Command |
| --- | --- | --- |
| Go unit/HTTP | Operations, malformed requests, HTTP contract, static hosting, shutdown | `cd backend && go test -race -count=1 ./...` |
| Go fuzz (run inside backend) | Successful calculations must remain finite; failures stay typed | `go test ./internal/calculator -run='^$' -fuzz=FuzzCalculateFiniteResult -fuzztime=3s -parallel=2` |
| Vitest | Parsing, formatting, API transport and React interactions | `cd frontend && npm run coverage` |
| TypeScript/Vite | Strict typecheck and production bundle | `cd frontend && npm run build` |
| Playwright/axe | Production React + real Go API; Chromium desktop/mobile layouts | `cd frontend && npm run test:e2e` (build first) |
| Live API smoke | Seven operations and representative invalid input | `node scripts/smoke-api.mjs` (server already running) |

The browser suite defines 13 scenarios for two viewport projects (26 executions), including
API calls, server overflow, offline recovery, keyboard use, layout and accessibility.
It does not mock successful arithmetic. Mobile emulation is **not** an iOS/Safari test.
No browser-suite pass is claimed until it actually runs.

Successful full verification generates `reports/COVERAGE.md`, frontend HTML/LCOV/JSON
coverage, backend HTML/text/profile coverage, browser reports/traces and desktop/mobile
screenshots. The frontend coverage configuration includes all production modules except
`main.tsx` (DOM mounting); test/setup code is excluded. Backend coverage includes the
server entrypoint. Coverage is not proof of correctness, and percentages are not invented
to meet a badge target.

CI has backend, frontend and Docker jobs. It requires the committed lockfile, runs tests
and the build, uploads coverage/browser evidence, then builds and smoke-tests the non-root
container. A remote CI run has **not** been triggered or verified by this archive.

## Optional Docker deployment

Generate and commit the real frontend lockfile first. Then:

```bash
docker compose up --build
```

Visit `http://localhost:8080`. Frontend assets and `/api` share one origin. The final image
runs as a non-root user with a health check. Compose restricts the port to loopback, uses
a read-only filesystem, drops Linux capabilities, and disables privilege escalation.

Without Compose:

```bash
docker build -t clarity-calculator .
docker run --rm -p 127.0.0.1:8080:8080 clarity-calculator
```

Container configuration is provided, but no local Docker run is claimed.

## Repository layout

```text
backend/                     Go domain, HTTP API, server and tests
frontend/src/                React UI, domain/API modules and Vitest tests
frontend/e2e/                Real-backend Playwright + axe scenarios
scripts/verify.mjs           Logged local verification without extra runner dependencies
scripts/smoke-api.mjs        Live API checks, also used by container CI
docs/                       Assignment, requirements, OpenAPI and reviewer guide
reports/                    Actual measured evidence and generated reports
.github/workflows/ci.yml     Build, test, browser and container pipeline
Dockerfile, compose.yaml    Optional single-container deployment
AI_USAGE.md                 AI disclosure and translated prompt record
```

## Publishing

Create an empty repository in your account, preferably public for straightforward review
(or explicitly grant the evaluators access). The archive has no remote configured.
To start your own history after extracting the source:

```bash
git init -b main
git add .
git add frontend/package-lock.json
git commit -m "Implement full-stack calculator with tests and documentation"
git remote add origin <YOUR_REPOSITORY_URL>
git push -u origin main
```

Do this only after the setup/verification command succeeds. Repositories restored from the
optional local Git bundle already have history and do not need `git init`. The bundle's
initial snapshot is explicitly authored by an AI assistant, not impersonating the candidate.

Confirm all remote CI jobs pass; share the repository URL and `AI_USAGE.md` with the
reviewer. Do not submit a ZIP instead of the requested repository link. Review the code
and be ready to explain the trade-offs rather than describing generated work as unaided.

## Primary references

- [Go HTTP server and shutdown](https://pkg.go.dev/net/http)
- [Go httptest](https://pkg.go.dev/net/http/httptest)
- [npm clean installs and lockfiles](https://docs.npmjs.com/cli/commands/npm-ci/)
- [React Testing Library cleanup](https://testing-library.com/docs/react-testing-library/setup/)
- [Vitest v3 coverage](https://v3.vitest.dev/guide/coverage)
- [Playwright web server](https://playwright.dev/docs/test-webserver)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
