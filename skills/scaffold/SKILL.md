---
name: scaffold
description: >
  Generate boilerplate structure for a component, module, service, or project
  type, matching the project's existing conventions. Use when starting
  something new. Supports --name, --type, --framework, --lang.
allowed-tools: Read, Write, Bash(ls *), Bash(cat package.json)
apsl:
  verb: scaffold
  inputs:
    target: { type: string, required: true }
    flags:
      name: { type: string, required: false }
      type: { type: string, required: false }
      framework: { type: string, required: false }
      lang: { type: string, required: false }
  outputs: { shape: artifact, pipeable: true }
  consumes: none
  contract-version: 1
---

# scaffold — Scaffolding Skill

## Execution Steps

1. **Detect project context** — read `package.json`, `Cargo.toml`,
   `pyproject.toml`, or equivalent; look for framework indicators.
2. **Understand what to scaffold** from the target argument and flags.
3. **Match existing conventions** — look at 2–3 similar existing files in the
   project first.
4. **Generate files** that match the project's:
   - Language and framework
   - Naming conventions
   - Import style (ESM vs CJS, relative vs alias)
   - Test file colocation patterns
5. **Output a file tree** of what was created:

```
Created:
  src/
  └── components/
      └── MyComponent/
          ├── index.ts
          ├── MyComponent.tsx
          ├── MyComponent.test.tsx
          └── MyComponent.types.ts
```
