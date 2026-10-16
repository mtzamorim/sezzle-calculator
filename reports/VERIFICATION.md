# Verification report - strengthened English delivery

**Later source review:** see [FINAL_REVIEW.md](FINAL_REVIEW.md) for fresh checks, the
component-test hook correction, and remaining submission gates. The original recorded
results below are preserved as historical evidence.

Recorded on 2026-10-15. Results refer to this source revision, not to a screenshot or
previous archive. **The source is complete; end-to-end submission readiness is not yet
established.** Frontend dependencies, the full React suite/build and remote publication
remain outstanding.

## Executed checks

| Check | Actual outcome | Evidence |
| --- | --- | --- |
| Go formatting | Passed; no files reported | `evidence/backend-go-format.txt` |
| Go vet | Passed | `evidence/backend-go-vet.txt` |
| Go unit/HTTP/lifecycle tests with race detector | Passed with `-race -count=1` | `evidence/backend-go-tests.txt` |
| Go binary build | Passed | `evidence/backend-go-build.txt` |
| Go coverage | Measured, including all packages and server entrypoint | `backend-coverage.txt`, `.out`, `.html` |
| Bounded Go fuzz run | Passed; 188,379 executions recorded in the three-second run | `evidence/backend-fuzz.txt` |
| Real HTTP API smoke | Health, all seven operations and five representative error scenarios passed | `evidence/live-api-checks.txt` |
| Actual frontend core typecheck | Passed for the four standalone production domain/client modules | `evidence/frontend-core-typecheck.txt` |
| Actual frontend core runtime checks | 41 passed, 0 failed; includes real client calls to the Go API and a real ten-second timeout | `evidence/frontend-core-runtime.txt` |
| TS/TSX syntax transpilation | 16 files, no syntax errors; not a full project typecheck | `evidence/frontend-syntax.json` |
| OpenAPI/config checks | Local references, eight schemas, example validity and YAML parsing passed; not remote CI or a full OpenAPI toolchain audit | `evidence/config-contract-check.json` |

The fuzz target checks that successful results are finite and failures stay typed. Its
execution count does not mean every possible calculation was verified. Table-driven
operation tests separately assert known expected arithmetic results.

The standalone TypeScript checks execute the real client/validation/formatting code,
compiled to CommonJS with the globally available TypeScript compiler. They do **not**
mount React, execute Vitest, check every frontend type, generate V8 coverage, or run a
browser. They must not be presented as a passing frontend component suite.

## Measured backend statement coverage

| Scope | Coverage |
| --- | --- |
| Arithmetic domain | 100.0% |
| HTTP API | 96.3% |
| Server/static/lifecycle package | 56.9% |
| Total, including startup code | **82.7%** |

The static-hosting function is covered at 100%, the serve/shutdown helper at 80%, and
`main` itself at 0%. No package was excluded to inflate the overall percentage. No
frontend coverage percentage is asserted.

## Blocked or unexecuted checks

| Check | Actual outcome |
| --- | --- |
| npm installation | DNS/network failures `EAI_AGAIN`; a bounded 18-second attempt ended with exit 124 |
| Vitest coverage | Runner never started: `vitest: not found`, exit 127 |
| Full frontend build | Typecheck stopped on missing dependency types, exit 2; Vite did not run |
| Production Playwright/axe | Authored, not executed; npm packages/build unavailable |
| Real React UI/browser screenshots | Not produced in this revision; no static preview is presented as interactive evidence |
| Docker | Executable unavailable; Dockerfile/Compose/CI authored, no image/run claimed |
| Real dependency lockfile | Not generated; no synthetic lockfile provided |
| Remote Git repository / CI | Not published, triggered or verified; local Git snapshot/bundle is not a remote URL |

The exact failed command outputs are `evidence/npm-install.txt`,
`evidence/frontend-coverage-attempt.txt`, and `evidence/frontend-build-attempt.txt`.
A port conflict occurred during initial local smoke startup; the successful recorded run
used `PORT=19090` and `API_URL=http://127.0.0.1:19090`, avoiding the unrelated service on
8080. The provided default application port remains 8080.

## Reproduce the normal verification

From the project root in an environment with Go, Node and npm network access:

```bash
node scripts/verify.mjs --install --e2e
```

Commit the resulting `frontend/package-lock.json`. Then run again without `--install`
to prove a clean locked install. Add `--race` when a C compiler is available. On Linux,
Playwright may require `npx playwright install --with-deps chromium` inside `frontend`.
The script records actual exit codes and stops on failure rather than hiding it.

After a successful frontend run, inspect the generated coverage/browser evidence and
update this report with the new outcome. Run the optional Docker deployment and verify
all remote CI jobs on the commit actually sent to the evaluator. Do not submit this
snapshot as fully validated before those mandatory frontend checks succeed.

## Reproduce the supplemental core check

This is diagnostic evidence, not a replacement for the normal Vitest suite. It requires
a TypeScript compiler on PATH and an already running Go API. The recorded runtime used
Go 1.23.2, Node 22.16.0, npm 10.9.2 and global TypeScript 5.8.3. Declared frontend
TypeScript is 5.9.3; its installation was not completed.

```bash
# From the project root, use an output directory outside the ESM frontend package.
tsc --strict --target ES2022 --module commonjs --lib ES2022,DOM \
  --skipLibCheck --outDir /tmp/clarity-core \
  frontend/src/domain/operations.ts frontend/src/domain/validation.ts \
  frontend/src/domain/format.ts frontend/src/api/calculator.ts

API_URL=http://localhost:8080 node reports/evidence/core-runtime-check.cjs /tmp/clarity-core
```

The 41 checks cover supported/invalid numeric input, display formatting, real HTTP
operations, malformed/mismatched API responses, math/network/JSON errors, active and
pre-cancellation, late transport success after cancellation, and response-body timeout.

CI is configured for Go 1.27.2 and Node 22; those remote runtime results are not inferred
from the older local toolchain. A full dependency security audit was not performed.
