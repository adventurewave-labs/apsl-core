---
name: fix
description: >
  Diagnose and repair a bug, error, or failing test. Use when something is
  broken and needs root-cause repair. Supports --error "message", --auto,
  --test (run tests after fix).
allowed-tools: Read, Write, Bash(*)
apsl:
  verb: fix
  inputs:
    target: { type: path, required: true }
    flags:
      error: { type: string, required: false }
      auto: { type: boolean, required: false, default: false }
      test: { type: boolean, required: false, default: false }
  outputs: { shape: diff, also: [status], pipeable: true }
  consumes: report
  contract-version: 1
---

# fix — Fix Skill

## Execution Steps

1. **Understand the error** from the `--error` flag, failing test output, or
   provided context.
2. **Locate the issue** — search the codebase for relevant code.
3. **Reproduce** if possible — run the failing test or command.
4. **Diagnose root cause** — do not fix symptoms; fix causes.
5. **Propose fix** (unless `--auto`) — show the specific change.
6. **Apply fix.**
7. **Verify** — if `--test` or a test suite exists, run relevant tests.
8. **Report outcome:**

```
## Fix Applied

**Root cause:** [what was actually wrong]
**Change:** [what was changed and why]
**Verified:** [test results or "manual verification needed"]
```
