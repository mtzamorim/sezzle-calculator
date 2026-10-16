# Submission checklist

## Included in this source delivery

- [x] English React/TypeScript frontend and Go backend; all seven operations.
- [x] Independent validation, safe errors and explicit numeric assumptions.
- [x] Unit/component tests and coverage configuration for both layers.
- [x] Actual Go coverage/report, live API checks and supplementary frontend core evidence.
- [x] Production browser/axe tests, CI, Dockerfile and Compose configuration.
- [x] Setup/API/design documentation, OpenAPI and reviewer walkthrough.
- [x] AI usage disclosure.

## Required before sending the repository URL

- [ ] Run `node scripts/verify.mjs --install --e2e` successfully from a network-enabled machine.
- [ ] Commit the real `frontend/package-lock.json`; confirm a clean `npm ci` works.
- [ ] Review the generated frontend coverage and include the measured report/evidence.
- [ ] Check the real interface on desktop and mobile; inspect overflow and keyboard/errors.
- [ ] Run `docker compose up --build` to verify the optional container deliverable.
- [ ] Publish the source repository; grant reviewers access when private.
- [ ] Confirm all backend/frontend/Docker GitHub Actions jobs pass on the submitted commit.
- [ ] Review every relevant module and be prepared to explain the decisions.
- [ ] Update `AI_USAGE.md` with any additional tools/prompts used after this snapshot.
- [ ] Replace historical verification status with truthful new evidence, not unchecked claims.
- [ ] Send the repository link, not only the ZIP, to Sezzle before your actual deadline.

Do not describe blocked checks as passed, infer a green pipeline from a YAML file, claim
complete accessibility from automated tests, or represent the assistant-authored Git
snapshot as an independently authored candidate history.
