---
name: analyze
description: >
  Deep analysis of code, architecture, data, or any target. Use when asked to
  examine, audit, inspect, review internals, or understand something thoroughly.
  Supports --type security|perf|types|deps|arch and --format md|json.
allowed-tools: Read, Glob, Bash(grep *), Bash(find *), Bash(git log *)
apsl:
  verb: analyze
  inputs:
    target: { type: path, required: true }
    flags:
      type: { type: "enum[security,perf,types,deps,arch]", required: false }
      format: { type: "enum[md,json]", required: false, default: md }
  outputs: { shape: report, pipeable: true }
  consumes: none
  contract-version: 1
---

# analyze — Analysis Skill

**Purpose:** Thorough examination of a target with structured findings.

## Execution Steps

1. **Orient** — Read the target path. If a directory, scan structure first
   (`find . -type f | head -30`).
2. **Understand** — Read key files to grasp purpose, patterns, and architecture.
3. **Examine** — Based on the `--type` flag:
   - `security` → auth flows, input validation, secrets, injection risks, CVEs in deps
   - `perf` → O(n²) patterns, blocking I/O, unnecessary re-renders, memory leaks
   - `types` → any-types, missing interfaces, unsafe casts, boundary contracts
   - `deps` → outdated packages, unused imports, circular dependencies
   - `arch` → coupling, cohesion, SOLID violations, layer separation
   - *(no flag)* → general quality: readability, maintainability, obvious bugs
4. **Report** — Output structured findings:

```
## Analysis: <target>
**Summary:** One-sentence verdict

### Findings
| Severity | Finding | Location | Recommendation |
|----------|---------|----------|----------------|
| HIGH     | ...     | file:line | ...           |
| MED      | ...     | file:line | ...           |
| LOW      | ...     | file:line | ...           |

### Recommendations
1. ...
```

If `--format json` is present, output valid JSON with this exact schema instead:

```json
{
  "target": "...",
  "summary": "...",
  "findings": [{ "severity": "HIGH|MED|LOW", "finding": "...", "location": "...", "recommendation": "..." }],
  "recommendations": ["..."]
}
```
