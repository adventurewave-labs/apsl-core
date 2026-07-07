---
name: review
description: >
  Structured code or PR review with actionable feedback organized by severity.
  Use when asked to review changes, a branch, a PR, or specific files.
  Supports --type pr|security|performance|style|all.
allowed-tools: Read, Glob, Bash(git diff *), Bash(git log *)
apsl:
  verb: review
  inputs:
    target: { type: path, required: true }
    flags:
      type: { type: "enum[pr,security,performance,style,all]", required: false, default: pr }
  outputs: { shape: report, pipeable: true }
  consumes: diff
  contract-version: 1
---

# review — Review Skill

## Execution Steps

1. **Get the diff** — if reviewing HEAD or a branch: `git diff main...HEAD`.
2. **Read changed files** for full context.
3. **Apply the review lens** based on `--type`:
   - `pr` → correctness, test coverage, edge cases, docs
   - `security` → OWASP top 10, auth/authz, input validation, secrets
   - `performance` → algorithmic complexity, I/O patterns, caching
   - `style` → naming, formatting, consistency with codebase conventions
   - `all` → all of the above
4. **Output structured review:**

```
## Review: <target>

### 🔴 Must Fix (blocks merge)
- [ ] issue — file:line — explanation

### 🟡 Should Fix (important but not blocking)
- [ ] issue — file:line — explanation

### 🟢 Suggestions (optional improvements)
- [ ] suggestion — file:line — explanation

### ✅ Looks Good
- What was done well

### Summary
[One paragraph verdict]
```
