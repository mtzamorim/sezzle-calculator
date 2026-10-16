# AI Assistance Disclosure

## Tool and scope

ChatGPT assisted with the application architecture, Go API, React/TypeScript interface,
unit/component tests, styling, CI, Docker configuration, documentation, and code review.
Shell tools were used for inspection and verification attempts. Official documentation
was consulted for the testing setup and package-installation behavior.

The candidate must understand and review the implementation before submitting it. This
file does not claim that every generated line was independently validated or that the
assignment was completed within a particular number of hours.

### 1. Initial implementation request

The assignment specified React (TypeScript preferred), a backend microservice (Go
preferred), basic arithmetic, optional exponentiation/square root/percentage, independent
validation, a responsive interface, tests for both layers, coverage reports, setup/API/design
documentation, optional Docker packaging, a Git repository, and disclosure of AI prompts.

### 2. Frontend verification follow-up

The review added explicit React Testing Library cleanup, expanded component scenarios,
corrected asynchronous assertions, and documented the blocked verification attempts.


### 3. Complete requirements and a differentiated delivery

This revision strengthened runtime response validation, request cancellation/timeouts,
keyboard/error semantics, HTTP JSON errors and body limits, static asset routing and
server shutdown. It added/expanded tests, a bounded fuzz target, production Playwright
and axe scenarios, a verification script, strict lockfile-dependent CI/Docker, OpenAPI,
a requirement matrix and a reviewer walkthrough. Arithmetic semantics were preserved.
Go and standalone frontend-core checks were executed. React, browser and Docker checks
were not claimed as executed when their prerequisites were unavailable.

The verification used container shell/Go/Node/TypeScript tools and consulted primary
Go, npm, Testing Library, Vitest and Playwright documentation. Vitest and its V8 provider
were kept in the same 3.x patch version. A bounded install attempt failed to reach npm.
No external repository was created or modified through the connected GitHub account.
A local source snapshot/bundle was created with an explicit AI-assistant author identity;
no candidate-authored history or development time was fabricated.

## Verification disclosure

The actual results, tool versions, and limitations for this revision are recorded in
[reports/VERIFICATION.md](reports/VERIFICATION.md). Raw command output is under
`reports/evidence/`.

Frontend dependencies could not be installed in the packaging environment. Therefore
Vitest results, frontend coverage percentages, a successful production frontend build,
a Docker run, a browser integration test, and a passing remote CI run are not claimed.
The missing package lockfile has not been synthesized by hand.

Any later assistance used after this archive should be added here before submission.

## Later setup, publishing, and final verification requests

The response did not guarantee selection. This review re-examined the latest archive,
reran backend and standalone frontend-core checks, attempted the frontend verification,
and inspected static JSX/CSS layouts. It found and corrected an implicit mock return
from the component-test `beforeEach` hook, using the Vitest v3 documentation. It also
regenerated the stale source manifest. No application or arithmetic logic was changed.
The full React/Vitest suite, Vite build, project browser suite, Docker, and remote CI
remain unverified in this runtime. Static layouts are not presented as interactive React
test evidence. See `reports/FINAL_REVIEW.md` for the distinction.
