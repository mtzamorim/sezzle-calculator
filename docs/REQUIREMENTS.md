# Assignment requirement matrix

"Implemented" means source/configuration exists. "Passed" means the associated check
actually ran in the recorded preparation runtime. These are intentionally different.

| Requirement | Implementation/evidence | Current state |
| --- | --- | --- |
| React frontend, TypeScript preferred | `frontend/src/`, strict `tsconfig.json` | Implemented; React execution/full build unverified |
| Go backend microservice | `backend/cmd/server`, `internal/httpapi` | Built and live HTTP checked |
| Addition/subtraction/multiplication/division | Pure Go domain and frontend operation controls | Domain/API passed; React interaction tests authored |
| Exponentiation/square root/percentage (optional) | Same domain/contract with explicit unary/percentage semantics | Domain/API passed |
| Frontend consumes REST API | Typed client sends POST; no local arithmetic fallback | Actual client checked against real API for all seven operations |
| Intuitive entry and result display | Operation controls, dynamic labels, result/history panels | Implemented; interactive React review pending |
| Frontend validation/errors | Parsing, finite-number checks, focus/inline errors, network/timeout handling | Production core checks passed; component suite pending |
| Basic responsive/mobile support | CSS breakpoints and Playwright 390 px project | Implemented; actual React browser execution pending |
| Backend input/edge-case validation | Strict JSON shape, finite operands/results, null/missing values, zero divisor | Go unit/HTTP/live checks passed |
| JSON results and stable errors | Response echo + result, typed JSON error envelope, statuses | Go contract checks passed; OpenAPI included |
| Clean maintainable code | Small domain/API/UI separation, standard-library backend | Implemented; reviewer judgment still required |
| Unit tests for both layers | Go tests, Vitest domain/client/component tests | Go passed; Vitest runner not installed here |
| Coverage report | Backend HTML/text/profile; frontend V8 HTML/LCOV/JSON configured | Backend measured; frontend report not yet generated |
| Setup/run instructions | README and root verification script | Included; backend-only script executed |
| API examples | README, `docs/api.http`, OpenAPI | Live examples checked |
| Rationale/assumptions | README numerical, state, security and async decisions | Included |
| Full-stack Dockerfile (optional) | Multi-stage non-root image and compose | Authored; local Docker unavailable |
| Git repository and link | Complete source + separate local Git bundle | Local repository provided; remote publication/CI pending |
| Share AI prompts | `AI_USAGE.md`, translations labeled | Included; add any future assistance |
| Prioritize correctness/clarity | No DB/auth/expression parser; quality additions stay bounded | Design choice; no elapsed-effort claim |

## Added review value, not new product scope

Runtime response-contract verification; cancellation and timeout handling; a logged
verification command; real-backend browser test definitions; accessible input/error
semantics; non-root container configuration; fuzz/property tests; JSON error consistency;
OpenAPI; and an evaluator-oriented walkthrough.

None of these replaces the mandatory successful frontend test/build/coverage run.
