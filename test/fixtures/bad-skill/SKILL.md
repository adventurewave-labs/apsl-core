---
name: badverb
description: "Fixture: contract block with deliberate errors."
apsl:
  verb: wrong-name
  inputs:
    target: { type: pathz, required: yes-please }
    bogus: { type: string }
  outputs: { shape: blob, pipeable: true }
  consumes: "report|nonsense"
  contract-version: 2
---

Deliberately broken fixture. The linter must produce:
- ERROR: verb does not match skill name
- WARN: verb does not match directory name
- ERROR: contract-version must be 1
- ERROR: invalid output shape 'blob'
- ERROR: invalid consumes
- ERROR: invalid field type 'pathz'
- WARN: unknown inputs key 'bogus'
