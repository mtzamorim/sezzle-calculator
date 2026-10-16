# Getting Started — Reviewer Setup and Verification

This guide provides a complete path from a fresh checkout to a running application, automated tests, and an optional production-like Docker deployment. All commands are run from the **repository root**, unless a directory change is shown.

## 1. Prerequisites

- **Go 1.23+** (`go version`). The backend uses the Go standard library only.
- **Node.js 22.12+** (`node --version`) and npm (`npm --version`). `.nvmrc` pins a recommended Node version.
- **Git** to clone the repository.
- Internet access for the initial npm dependency installation and Playwright browser download.
- **Docker + Docker Compose** only if using the optional container workflow.

No database, API keys, secrets, external accounts, or environment variables are required for local development. Ensure ports **8080** and **5173** are available.

## 2. Clone and install

```bash
git clone <REPOSITORY_URL>
cd sezzle-calculator
cd frontend
npm install --include=dev
cd ..
```

The repository URL must be replaced with the actual published GitHub URL. `npm install` creates `frontend/package-lock.json` if it is missing. A maintainer should commit this lockfile before submitting the project; reviewers can then use `npm ci --include=dev` instead for reproducible installation.

## 3. Start the application locally (two terminals)

**Terminal A — Go API**

```bash
cd backend
go run ./cmd/server
```

The backend listens at **http://localhost:8080**. Verify it with:

```bash
curl http://localhost:8080/api/v1/health
```

Expected JSON: `{"status":"ok"}`.

**Terminal B — React frontend** (from the repository root)

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` requests to the Go server, so both processes must be running for calculations to work. Keep both terminals open while reviewing.

## 4. Smoke-test the application

1. Add **12 + 8**: expect **20** and an entry in recent history.
2. Divide **10 / 0**: expect a validation error rather than a result.
3. Compute the square root of **81**: expect **9**, with only one operand field.
4. Compute **15% of 200**: expect **30**.
5. Submit with **Enter**, try invalid input, retry after correcting it, and resize to a mobile viewport.
6. Refresh the page: the recent-history list is intentionally in memory only.

The browser should show a POST to `/api/v1/calculate` when a valid calculation is submitted. The Go backend performs the arithmetic.

## 5. Test the REST API directly

```bash
curl -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"add","a":12,"b":8}'
```

Expected JSON:

```json
{"operation":"add","a":12,"b":8,"result":20}
```

Test server-side error handling:

```bash
curl -i -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"divide","a":10,"b":0}'
```

Expected HTTP **422** with JSON `error.code` equal to `math_error`. For Windows PowerShell, use `Invoke-RestMethod` or Git Bash for the POSIX curl examples. Additional requests are in `docs/api.http`; the API schema is in `docs/openapi.yaml`.

## 6. Run unit tests, coverage, and production build

**Backend:**

```bash
cd backend
go vet ./...
go test -race -count=1 ./...
go test -count=1 -coverprofile=../reports/backend-coverage.out ./...
go tool cover -func=../reports/backend-coverage.out
cd ..
```

**Frontend:**

```bash
cd frontend
npm run verify
cd ..
```

`npm run verify` runs the Vitest coverage suite, TypeScript typecheck, and Vite production build. Expected outputs after a successful run include `reports/frontend-coverage/` and `frontend/dist/`.

**One-command verification (from the repository root):**

```bash
node scripts/verify.mjs --install --e2e
```

This command installs dependencies as necessary, runs backend/frontend checks, and runs end-to-end tests. It may download Chromium and takes longer than the basic smoke test. Check `reports/local-verification/` for generated logs. Run `node scripts/verify.mjs --help` for available flags.

**Important:** Test files being present does not prove they have passed. See `reports/VERIFICATION.md` for checks executed in the preparation environment and any outstanding verification.

## 7. Optional production-like Docker run

From the repository root:

```bash
docker compose up --build
```

Open **http://localhost:8080**. In this mode, the Go server serves both the compiled frontend and the API on one origin. To stop:

```bash
docker compose down
```

Alternatively: `docker build -t clarity-calculator .` then `docker run --rm -p 8080:8080 clarity-calculator`. Docker requires access to dependencies during the image build. This workflow is optional and should not be considered verified unless the image successfully builds and runs.

## 8. Troubleshooting

| Symptom | What to check |
| --- | --- |
| `npm: command not found` | Install Node.js 22.12+ (npm is bundled with standard Node installers). |
| `vitest: not found` | From `frontend/`, run `npm install --include=dev`; check npm registry access. |
| npm `EAI_AGAIN` or network timeout | Check DNS, proxy/VPN settings, and access to `registry.npmjs.org`; retry on a connected network. |
| Frontend opens but calculations fail | Confirm Go API is running on port 8080 and `curl /api/v1/health` succeeds. |
| `EADDRINUSE` / address already in use | Stop the process occupying port 5173 or 8080; see `frontend/vite.config.ts` for proxy configuration. |
| Playwright browser missing | From `frontend/`, run `npm run install:browsers`. |
| Docker cannot start on port 8080 | Stop the local Go server or other process already using that port. |
| `npm ci` fails because lockfile is absent | First run `npm install --include=dev` and commit the generated `package-lock.json`; do not fabricate it. |

## 9. Where to look next

- `README.md` — architecture, requirements, API behavior, and design decisions.
- `docs/REVIEWER_GUIDE.md` — guided feature walkthrough and discussion topics.
- `docs/FRONTEND_TESTS.md` — test strategy and end-to-end test details.
- `docs/REQUIREMENTS.md` — assignment-to-implementation mapping.
- `reports/VERIFICATION.md` — executed checks versus pending verification.
- `AI_USAGE.md` — AI assistance disclosure and prompts.

Thank you for reviewing the project.
