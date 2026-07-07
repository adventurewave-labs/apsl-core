---
name: spawn
description: >
  Launch a subagent to handle a specialized task in isolation, keeping the main
  context clean. Use when delegating research, browsing, or deep code analysis.
  Agent types: explore, browser, codebase, general.
apsl:
  verb: spawn
  inputs:
    target: { type: "enum[explore,browser,codebase,general]", required: true }
    context: { type: string, required: true }
  outputs: { shape: report, pipeable: true }
  consumes: none
  contract-version: 1
---

# spawn — Subagent Delegation Skill

## Agent Type Mappings

- `explore` → research-focused, read-only agent
- `browser` → web browsing and UI interaction agent
- `codebase` → deep code analysis agent
- `general` → default general-purpose subagent

## Execution Steps

1. **Construct a focused task description** from the provided context.
2. **Delegate** to the specified agent type using the runtime's native
   subagent mechanism.
3. The subagent operates in isolation with its own context window.
4. **Scope the subagent's tool permissions to the minimum its task requires** —
   never inherit the parent's full permission set by default.
5. **Report findings back** to the main conversation on completion.
