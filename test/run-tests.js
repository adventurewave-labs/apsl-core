#!/usr/bin/env node
/* Fixture tests for apsl-lint. Zero deps. */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

const LINT = path.join(__dirname, '..', 'lint', 'apsl-lint.js');
let failures = 0;

function run(args) {
  try {
    return { code: 0, out: execFileSync('node', [LINT, ...args], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

function assert(name, cond, detail) {
  if (cond) console.log(`  ok  ${name}`);
  else { console.error(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); failures++; }
}

// 1. The pack passes its own linter with zero errors
{
  const r = run(['check', path.join(__dirname, '..', 'skills')]);
  assert('self-lint: exit 0', r.code === 0, `exit ${r.code}\n${r.out}`);
  assert('self-lint: 0 errors', /^0 error\(s\)/m.test(r.out), r.out);
}

// 2. Bad fixture produces errors and non-zero exit
{
  const r = run(['check', path.join(__dirname, 'fixtures')]);
  assert('bad fixture: exit 1', r.code === 1, `exit ${r.code}`);
  assert('bad fixture: verb/name mismatch', /does not match skill name/.test(r.out), r.out);
  assert('bad fixture: contract-version', /contract-version must be 1/.test(r.out), r.out);
  assert('bad fixture: invalid shape', /'blob' not one of/.test(r.out), r.out);
  assert('bad fixture: invalid consumes', /consumes '.*nonsense.*' invalid/.test(r.out), r.out);
  assert('bad fixture: invalid field type', /'pathz' invalid/.test(r.out), r.out);
  assert('bad fixture: unknown inputs key', /unknown inputs key 'bogus'/.test(r.out), r.out);
}

// 3. Workflow lint fires all warning classes and always exits 0
{
  const r = run(['workflow', path.join(__dirname, '..', 'examples', 'DEPLOY.md')]);
  assert('workflow: exit 0', r.code === 0, `exit ${r.code}`);
  assert('workflow: W1 ungated prod deploy', /no preceding stop\/checkpoint/.test(r.out), r.out);
  assert('workflow: W2 plan -> deploy', /does not consume/.test(r.out), r.out);
  assert('workflow: W3 unattended --auto', /unattended mutation/.test(r.out), r.out);
}

// 4. verbs --json lists all ten core verbs
{
  const r = run(['verbs', '--json']);
  const verbs = JSON.parse(r.out).map(v => v.verb);
  const expected = ['analyze', 'review', 'refactor', 'fix', 'plan', 'stop',
    'scaffold', 'commit', 'document', 'spawn'];
  for (const v of expected)
    assert(`verbs: ${v} present`, verbs.includes(v));
}

console.log(failures === 0 ? '\nAll tests passed.' : `\n${failures} test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
