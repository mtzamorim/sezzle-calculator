# Measured coverage snapshot

| Scope | Statement coverage | Measurement status |
| --- | --- | --- |
| Go arithmetic domain | 100.0% | Executed |
| Go HTTP API | 96.3% | Executed |
| Go server/static/lifecycle package | 56.9% | Executed |
| Go total, no excluded packages | **82.7%** | Executed |
| Frontend | Not measured | Vitest dependencies unavailable |

The separate 41 passing frontend-core runtime checks do not establish React/Vitest
coverage. Run the verification script after installing dependencies to replace this
snapshot with the full measured summary. See `VERIFICATION.md` for commands and limits.
