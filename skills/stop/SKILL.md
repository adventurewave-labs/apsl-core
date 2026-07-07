---
name: stop
description: >
  Request a pause for explicit human approval before proceeding. Use as a
  checkpoint before irreversible operations like deploy, delete, publish, or
  any action with production impact.
apsl:
  verb: stop
  inputs:
    target: { type: none }
    context: { type: string, required: false }
  outputs: { shape: status, pipeable: false }
  consumes: none
  contract-version: 1
---

# stop — Checkpoint Skill

## Execution Steps

1. **Summarize** what has been accomplished so far in the current workflow.
2. **State clearly** what action comes NEXT if execution continues.
3. **State the reason** for this checkpoint (if provided).
4. **Show the checkpoint block:**

```
══════════════════════════════════════════
⏸  CHECKPOINT
══════════════════════════════════════════
Completed:
  ✓ [list what's done]

Next action if you approve:
  → [exact next step, be specific]

Reason for checkpoint:
  [reason, or "manual checkpoint in workflow"]

To review before approving:
  - [specific files, diffs, or outputs to check]
══════════════════════════════════════════
Reply "approved", "go", or "proceed" to continue.
Reply anything else to modify the plan.
══════════════════════════════════════════
```

5. **Request that execution not proceed** until the user explicitly approves.
6. Treat any non-approval response as a modification request.

> **IMPORTANT:** This skill places a checkpoint INSTRUCTION in the prompt. It
> does not technically enforce a halt. For guaranteed gating of irreversible
> actions, configure the agent runtime's tool-permission system to require
> approval for the relevant tools.
