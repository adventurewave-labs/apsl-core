# apsl-core

**Ten agent skills with canonical verb names and declared I/O contracts.**

This is a skill pack and a convention. It is **not a language, not a standard,
and not a runtime.** If you're looking for the APSL "Agentic Prompt Scripting
Language" — that was v0.2, and it was cut on purpose (see
[Scope](#scope-what-this-is-not)).

## Why

Every team invents its own `/commit-and-push` vs `/commit` vs `/git-commit`.
The same task, prompted by two engineers, gets phrased five ways. apsl-core
bets that a **small canonical verb vocabulary** plus **declared I/O
contracts** reduces that expression variance — and that this is worth having
even though agent behavior itself remains probabilistic.

## The verbs

| Verb | What it does | Output shape |
|------|-------------|--------------|
| `analyze` | Deep examination with structured findings | `report` |
| `review` | PR/code review by severity | `report` |
| `refactor` | Behavior-preserving cleanup, diff-first | `diff` |
| `fix` | Root-cause bug repair | `diff` |
| `plan` | Explicit plan, then request halt | `report` |
| `stop` | Checkpoint request before irreversible actions | `status` |
| `scaffold` | Convention-matching boilerplate | `artifact` |
| `commit` | Conventional Commits from the actual diff | `status` |
| `document` | API/README/inline/ADR docs | `artifact` |
| `spawn` | Minimum-permission subagent delegation | `report` |

## Install

```bash
# skills.sh (any Agent Skills-compatible agent)
npx skills add adventurewave-labs/apsl-core

# or manually: copy skills/* into your agent's skill directory
#   Claude Code: .claude/skills/     Gemini CLI: .gemini/skills/
#   Codex CLI:   ~/.codex/skills/    Convention: .agents/skills/
```

Invocation is your agent's native mechanism — slash commands
(`/analyze src/ --type security`) or natural language that triggers on the
skill description. **No new syntax is defined by this package.**

## The contract block

Every skill declares its I/O in an `apsl` block in SKILL.md frontmatter:

```yaml
apsl:
  verb: analyze
  inputs:
    target: { type: path, required: true }
    flags:
      type: { type: "enum[security,perf,types,deps,arch]", required: false }
  outputs: { shape: report, pipeable: true }
  consumes: none
  contract-version: 1
```

Six closed output shapes: `report`, `diff`, `text`, `json`, `status`,
`artifact`. Contracts are **declared and advisory** — documentation with
tooling support, never runtime enforcement. Their value: you (or an agent)
can read a skill's I/O without reading its implementation, and third-party
skills that adopt the block become vocabulary-compatible.

JSON Schema: [`schema/apsl-contract.schema.json`](schema/apsl-contract.schema.json).
Third-party skill authors: add the block, run the linter, done.

## apsl-lint

Zero-dependency Node CLI. Warnings never block.

```bash
apsl-lint check ./skills        # validate contract blocks
apsl-lint workflow DEPLOY.md    # scan a prose workflow for intent bugs
apsl-lint verbs                 # list installed verbs (project > user > apsl-core)
```

`workflow` catches things like a production deploy step with no preceding
stop/checkpoint (autonomous-pipeline risk), or `plan` output feeding a step
that can't consume it.

## Safety honesty

`stop` and `plan` place checkpoint **instructions** in the prompt. They do not
enforce a halt — no prompt can. For guaranteed gating of irreversible actions,
configure your agent's native tool-permission system. Every skill body that
carries halt semantics says this explicitly. No apsl-core material uses
"deterministic," "guaranteed," or "enforced" to describe agent behavior.

## Scope (what this is NOT)

- **No language.** No grammar, no parser, no `.apsl` files, no composition
  operators. If it needs a BNF, it's out of scope.
- **No runtime.** Nothing here executes, intercepts, or transforms prompts.
- **No enforcement.** Contracts are advisory; `stop` is a request.
- **No new invocation syntax.** Slash commands and description-triggering are
  the interface.

These are hard boundaries, not a roadmap. Syntax discussions reopen only if
real users demonstrably write sequential verb chains in prose and complain
about verbosity — see PRD v0.3, evidence gates.

## License

MIT
