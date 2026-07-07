---
name: commit
description: >
  Stage and commit changes with a well-formed Conventional Commits message.
  Analyzes the diff to auto-generate a message if none is provided.
  Supports --msg "custom message", --no-push, --type feat|fix|chore|docs|refactor.
allowed-tools: Bash(git *)
apsl:
  verb: commit
  inputs:
    target: { type: none }
    flags:
      msg: { type: string, required: false }
      no-push: { type: boolean, required: false, default: false }
      type: { type: "enum[feat,fix,chore,docs,refactor,test,perf,style]", required: false }
  outputs: { shape: status, pipeable: false }
  consumes: diff
  contract-version: 1
---

# commit — Commit Skill

## Execution Steps

1. **Check status** — `git status` and `git diff --cached --stat`.
2. **If nothing staged** — run `git add -A`.
3. **Generate the commit message** (unless `--msg` provided):
   - Run `git diff --cached` and read the actual diff
   - Follow Conventional Commits: `type(scope): description`
   - Types: feat, fix, chore, docs, refactor, test, perf, style
   - First line under 72 characters; add a body if changes are complex
4. **Show the proposed commit** before executing:

```
Proposed commit:
  feat(auth): add JWT refresh token rotation

  - Implements silent token refresh on 401 responses
  - Adds token blacklist for logout

Files: src/auth/jwt.ts, src/middleware/auth.ts
```

5. **Commit** with `git commit -m "..."`.
6. **Push** unless `--no-push` is set.
