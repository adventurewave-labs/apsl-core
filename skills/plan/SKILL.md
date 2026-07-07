---
name: plan
description: >
  Generate an explicit step-by-step plan before taking action. Use before
  complex, multi-step, or risky tasks to enforce think-before-act discipline.
  After presenting the plan, request a halt and wait for approval.
allowed-tools: Read
apsl:
  verb: plan
  inputs:
    target: { type: none }
    context: { type: string, required: true }
  outputs: { shape: report, pipeable: true }
  consumes: "text|report|diff"
  contract-version: 1
---

# plan — Planning Skill

**Core rule: Present the plan. Then request a halt. Never begin execution
without approval.**

## Execution Steps

1. **Load context** — read CLAUDE.md, GEMINI.md, AGENTS.md, README, or relevant docs.
2. **Understand the goal** from the provided context.
3. **Think through the problem** — unknowns, failure modes, dependencies.
4. **Generate a numbered plan:**

```
## Plan: <goal>

### Steps
1. [LOW RISK] Description of step one
   - What: specific action
   - Files affected: list
   - Reversible: yes/no

2. [MED RISK] ...

⏸ CHECKPOINT — Recommend human review before step N (reason: ...)

N. [HIGH RISK] Final step

### Dependencies
- Step 3 requires Step 2 to complete successfully

### Risks
- If step 4 fails: fallback is ...
```

5. **Request a halt** — display:

```
─────────────────────────────────
⏸ PLAN COMPLETE — AWAITING APPROVAL
─────────────────────────────────
Reply "approved" or "go" to begin execution,
or describe modifications to the plan.
─────────────────────────────────
```

6. Do not proceed until explicit approval is given. Treat any non-approval
   response as a modification request.

> **Note:** Steps 5–6 describe *requested* behavior. Actual halting is not
> guaranteed by this skill; pair with the agent's native permission controls
> for hard gating.
