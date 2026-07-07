---
name: document
description: >
  Generate or update documentation for code, APIs, or architecture.
  Use when asked to document, write a README, add comments, or produce an ADR.
  Supports --type api|readme|inline|arch and --out filepath.
allowed-tools: Read, Write, Glob, Bash(git log --oneline *)
apsl:
  verb: document
  inputs:
    target: { type: path, required: true }
    flags:
      type: { type: "enum[api,readme,inline,arch]", required: false }
      out: { type: path, required: false }
  outputs: { shape: artifact, pipeable: true }
  consumes: "diff|report"
  contract-version: 1
---

# document — Documentation Skill

## Execution Steps

1. **Read target** — understand what needs documenting.
2. **Check existing docs** — do not duplicate; extend and correct.
3. **Generate based on `--type`:**
   - `api` → JSDoc/TSDoc/rustdoc comments on all exported functions, types, classes
   - `readme` → README.md with description, install, usage, API summary, examples
   - `inline` → comment unclear logic throughout the file
   - `arch` → architecture decision record (ADR) format
4. **If `--out` provided**, write to that path; otherwise annotate in place.
5. **Quality bar:** docs must answer "what does this do?" and "how do I use
   it?" without the reader opening the implementation.
