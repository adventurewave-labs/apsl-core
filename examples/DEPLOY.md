# Deploy Workflow (example)

A prose workflow using the canonical verbs. Lint it:
`apsl-lint workflow examples/DEPLOY.md`

## Release

1. Run the test suite with fail-fast; abort on any failure.
2. review HEAD --type security
3. checkpoint: save pre-deploy state.
4. deploy to staging and smoke-test the staging URL.
5. stop — await human approval before production deploy.
6. deploy --env production
7. commit --msg "release: deployed to prod"

## Bad example (the linter should complain)

1. plan the hotfix rollout
2. deploy --env production
3. fix src/ --auto
