#!/usr/bin/env node
/**
 * apsl-lint — advisory linter for APSL contract blocks and prose workflows.
 *
 * Zero dependencies. Warnings never block: `check` exits 1 only on ERRORs
 * (malformed contracts), never on warnings. `workflow` always exits 0.
 *
 * Commands:
 *   apsl-lint check <skills-dir>      validate SKILL.md contract blocks
 *   apsl-lint workflow <file.md>      scan a prose workflow for intent bugs
 *   apsl-lint verbs [--json]          list installed verbs + contracts
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const SHAPES = ['report', 'diff', 'text', 'json', 'status', 'artifact'];
const FIELD_TYPE_RE = /^(path|string|boolean|none|enum\[[a-z0-9-]+(,[a-z0-9-]+)*\])$/;
const CONSUMES_RE = /^(none|(report|diff|text|json|status|artifact)(\|(report|diff|text|json|status|artifact))*)$/;
const VERB_RE = /^[a-z][a-z0-9-]*$/;

/* ────────────────────────────────────────────────────────────────────────
 * Minimal YAML subset parser — supports exactly what APSL frontmatter uses:
 * block mappings (2-space indent), flow mappings { k: v }, flow arrays
 * [a, b], quoted/unquoted scalars, booleans, integers, and `>` folded
 * blocks. Commas inside enum[...] brackets are handled. This is NOT a
 * general YAML parser and does not try to be.
 * ──────────────────────────────────────────────────────────────────────── */

function parseScalar(raw) {
  const s = raw.trim();
  if (s === '') return '';
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
    return s.slice(1, -1);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  return s;
}

// split "a: 1, b: enum[x,y], c: 2" at top-level commas only
function splitFlow(s) {
  const parts = [];
  let depth = 0, cur = '', inStr = null;
  for (const ch of s) {
    if (inStr) { cur += ch; if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; cur += ch; continue; }
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function parseFlowValue(s) {
  const t = s.trim();
  if (t.startsWith('{') && t.endsWith('}')) {
    const obj = {};
    for (const part of splitFlow(t.slice(1, -1))) {
      const i = topLevelColon(part);
      if (i === -1) continue;
      obj[part.slice(0, i).trim()] = parseFlowValue(part.slice(i + 1));
    }
    return obj;
  }
  if (t.startsWith('[') && t.endsWith(']') && !/^enum\[/.test(t)) {
    return splitFlow(t.slice(1, -1)).map(parseFlowValue);
  }
  return parseScalar(t);
}

// first ':' not inside brackets/quotes (so enum[a,b] keys/values survive)
function topLevelColon(s) {
  let depth = 0, inStr = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') depth--;
    if (ch === ':' && depth === 0) return i;
  }
  return -1;
}

function parseYamlBlock(lines, start, indent) {
  const obj = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) { i++; continue; }
    const lineIndent = line.length - line.trimStart().length;
    if (lineIndent < indent) break;
    if (lineIndent > indent) { i++; continue; } // over-indented stray; child blocks are consumed below
    const body = line.trim();
    const ci = topLevelColon(body);
    if (ci === -1) { i++; continue; }
    const key = body.slice(0, ci).trim();
    const rest = body.slice(ci + 1).trim();
    if (rest === '' ) {
      // nested block mapping
      const child = parseYamlBlock(lines, i + 1, indent + 2);
      obj[key] = child.value;
      i = child.next;
    } else if (rest === '>' || rest === '|') {
      // folded/literal block scalar
      const parts = [];
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() !== '' && (l.length - l.trimStart().length) <= indent) break;
        parts.push(l.trim());
        i++;
      }
      obj[key] = parts.join(rest === '>' ? ' ' : '\n').trim();
    } else {
      obj[key] = parseFlowValue(rest);
      i++;
    }
  }
  return { value: obj, next: i };
}

function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  return parseYamlBlock(m[1].split(/\r?\n/), 0, 0).value;
}

/* ──────────────────────────── diagnostics ─────────────────────────────── */

const out = [];
function report(level, file, msg) { out.push({ level, file, msg }); }

function flush() {
  const color = { ERROR: '\x1b[31m', WARN: '\x1b[33m', INFO: '\x1b[36m', OK: '\x1b[32m' };
  const reset = '\x1b[0m';
  const tty = process.stdout.isTTY;
  for (const d of out) {
    const tag = tty ? `${color[d.level]}${d.level}${reset}` : d.level;
    console.log(`${tag}  ${d.file}${d.msg ? ' — ' + d.msg : ''}`);
  }
  const errors = out.filter(d => d.level === 'ERROR').length;
  const warns = out.filter(d => d.level === 'WARN').length;
  console.log(`\n${errors} error(s), ${warns} warning(s). Warnings never block.`);
  return errors > 0 ? 1 : 0;
}

/* ─────────────────────────────── check ────────────────────────────────── */

function validateField(name, field, file) {
  if (typeof field !== 'object' || field === null) {
    report('ERROR', file, `inputs.${name} must be a mapping like { type: path, required: true }`);
    return;
  }
  if (!field.type) report('ERROR', file, `inputs.${name} missing 'type'`);
  else if (!FIELD_TYPE_RE.test(String(field.type)))
    report('ERROR', file, `inputs.${name}.type '${field.type}' invalid — use path|string|boolean|none|enum[a,b]`);
  if ('required' in field && typeof field.required !== 'boolean')
    report('ERROR', file, `inputs.${name}.required must be boolean`);
}

function checkSkill(dir) {
  const file = path.join(dir, 'SKILL.md');
  const rel = path.relative(process.cwd(), file);
  if (!fs.existsSync(file)) { report('ERROR', rel, 'SKILL.md missing'); return; }
  const md = fs.readFileSync(file, 'utf8');
  const fm = parseFrontmatter(md);
  if (!fm) { report('ERROR', rel, 'no YAML frontmatter found'); return; }

  // Agent Skills required fields
  if (!fm.name) report('ERROR', rel, "missing required frontmatter field 'name'");
  if (!fm.description) report('ERROR', rel, "missing required frontmatter field 'description'");

  const apsl = fm.apsl;
  if (!apsl) { report('INFO', rel, 'no apsl contract block (skill is valid, just not contract-declared)'); return; }

  for (const key of ['verb', 'inputs', 'outputs', 'contract-version'])
    if (!(key in apsl)) report('ERROR', rel, `apsl block missing required key '${key}'`);

  if (apsl.verb) {
    if (!VERB_RE.test(String(apsl.verb)))
      report('ERROR', rel, `verb '${apsl.verb}' invalid — lowercase, digits, hyphens`);
    if (fm.name && apsl.verb !== fm.name)
      report('ERROR', rel, `apsl.verb '${apsl.verb}' does not match skill name '${fm.name}'`);
    const dirName = path.basename(dir);
    if (apsl.verb !== dirName)
      report('WARN', rel, `apsl.verb '${apsl.verb}' does not match directory name '${dirName}'`);
  }

  if ('contract-version' in apsl && apsl['contract-version'] !== 1)
    report('ERROR', rel, `contract-version must be 1, got '${apsl['contract-version']}'`);

  if (apsl.outputs) {
    const o = apsl.outputs;
    if (!o.shape) report('ERROR', rel, 'outputs missing shape');
    else if (!SHAPES.includes(o.shape))
      report('ERROR', rel, `outputs.shape '${o.shape}' not one of: ${SHAPES.join(', ')}`);
    if (o.also) {
      const also = Array.isArray(o.also) ? o.also : [o.also];
      for (const s of also)
        if (!SHAPES.includes(s)) report('ERROR', rel, `outputs.also contains invalid shape '${s}'`);
    }
    if ('pipeable' in o && typeof o.pipeable !== 'boolean')
      report('ERROR', rel, 'outputs.pipeable must be boolean');
    // json shape must specify a schema in the body
    if (o.shape === 'json' && !/schema/i.test(md.split(/\r?\n---/).slice(1).join('')))
      report('WARN', rel, "declares shape 'json' but the body never specifies a schema");
  }

  if ('consumes' in apsl && !CONSUMES_RE.test(String(apsl.consumes)))
    report('ERROR', rel, `consumes '${apsl.consumes}' invalid — 'none' or pipe-separated shapes`);

  if (apsl.inputs) {
    for (const [k, v] of Object.entries(apsl.inputs)) {
      if (k === 'flags') {
        if (typeof v !== 'object' || v === null) { report('ERROR', rel, 'inputs.flags must be a mapping'); continue; }
        for (const [fk, fv] of Object.entries(v)) validateField(`flags.${fk}`, fv, rel);
      } else if (k === 'target' || k === 'context') {
        validateField(k, v, rel);
      } else {
        report('WARN', rel, `unknown inputs key '${k}' (expected target, context, flags)`);
      }
    }
  }
}

function cmdCheck(target) {
  const root = path.resolve(target || './skills');
  if (!fs.existsSync(root)) { console.error(`apsl-lint: '${root}' not found`); process.exit(2); }
  const dirs = fs.statSync(root).isDirectory() && fs.existsSync(path.join(root, 'SKILL.md'))
    ? [root]
    : fs.readdirSync(root).map(d => path.join(root, d)).filter(d => fs.statSync(d).isDirectory());
  if (dirs.length === 0) { console.error('apsl-lint: no skill directories found'); process.exit(2); }
  for (const d of dirs) checkSkill(d);
  for (const d of dirs) {
    const f = path.join(d, 'SKILL.md');
    if (fs.existsSync(f) && !out.some(x => x.file === path.relative(process.cwd(), f)))
      report('OK', path.relative(process.cwd(), f), '');
  }
  process.exit(flush());
}

/* ────────────────────────────── verbs ─────────────────────────────────── */

function collectVerbs() {
  const sources = [
    { label: 'project', dirs: ['.claude/skills', '.gemini/skills', '.agents/skills'].map(d => path.resolve(d)) },
    { label: 'user', dirs: ['.claude/skills', '.agents/skills'].map(d => path.join(os.homedir(), d)) },
    { label: 'apsl-core', dirs: [path.join(__dirname, '..', 'skills')] },
  ];
  const verbs = new Map(); // first hit wins: project > user > apsl-core
  for (const src of sources) {
    for (const dir of src.dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        const f = path.join(dir, entry, 'SKILL.md');
        if (!fs.existsSync(f)) continue;
        const fm = parseFrontmatter(fs.readFileSync(f, 'utf8'));
        if (!fm || !fm.name || verbs.has(fm.name)) continue;
        const a = fm.apsl || {};
        verbs.set(fm.name, {
          verb: fm.name,
          source: src.label,
          shape: (a.outputs && a.outputs.shape) || '—',
          consumes: a.consumes || '—',
          pipeable: a.outputs && 'pipeable' in a.outputs ? String(a.outputs.pipeable) : '—',
          contract: fm.apsl ? 'v' + (a['contract-version'] || '?') : 'none',
        });
      }
    }
  }
  return [...verbs.values()];
}

function cmdVerbs(json) {
  const verbs = collectVerbs();
  if (json) { console.log(JSON.stringify(verbs, null, 2)); return; }
  if (verbs.length === 0) { console.log('No skills found (project, user, or bundled apsl-core).'); return; }
  const cols = ['verb', 'source', 'shape', 'consumes', 'pipeable', 'contract'];
  const w = cols.map(c => Math.max(c.length, ...verbs.map(v => String(v[c]).length)));
  console.log(cols.map((c, i) => c.padEnd(w[i])).join('  '));
  console.log(w.map(n => '─'.repeat(n)).join('  '));
  for (const v of verbs) console.log(cols.map((c, i) => String(v[c]).padEnd(w[i])).join('  '));
}

/* ───────────────────────────── workflow ───────────────────────────────── */

const RISKY = /\b(deploy|publish|release)\b/i;
const PROD = /\b(prod|production)\b/i;
const GATE = /\b(stop|checkpoint|approval|approve|review before|await)\b/i;
const AUTO = /--auto\b/;
const MUTATING = /\b(fix|refactor|write)\b/i;

function cmdWorkflow(file) {
  if (!file || !fs.existsSync(file)) { console.error('apsl-lint: workflow file not found'); process.exit(2); }
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const steps = [];
  let section = 0;
  lines.forEach((l, idx) => {
    if (/^#{1,6}\s/.test(l)) section++; // gate scope resets per markdown section
    if (/^\s*(\d+[.)]|[-*])\s+/.test(l)) steps.push({ n: idx + 1, section, text: l });
  });
  if (steps.length === 0) { console.log('No numbered or bulleted steps found — nothing to lint.'); return; }

  let gateSeen = false, curSection = -1;
  for (const s of steps) {
    if (s.section !== curSection) { gateSeen = false; curSection = s.section; }
    if (GATE.test(s.text)) gateSeen = true;

    // W1: irreversible action with no preceding gate
    if (RISKY.test(s.text) && PROD.test(s.text) && !gateSeen)
      report('WARN', `${file}:${s.n}`,
        `production-impact step with no preceding stop/checkpoint — autonomous-pipeline risk: "${s.text.trim()}"`);

    // W3: unattended mutation
    if (AUTO.test(s.text) && MUTATING.test(s.text))
      report('INFO', `${file}:${s.n}`,
        `unattended mutation (--auto) — ensure the agent's permission system gates writes: "${s.text.trim()}"`);
  }

  // W2: plan output feeding directly into a risky step (report is not consumed by deploy)
  for (let i = 0; i < steps.length - 1; i++) {
    if (steps[i].section === steps[i + 1].section &&
        /\bplan\b/i.test(steps[i].text) && RISKY.test(steps[i + 1].text) && !GATE.test(steps[i].text))
      report('WARN', `${file}:${steps[i + 1].n}`,
        `'plan' produces a report that '${steps[i + 1].text.trim()}' does not consume — did you mean to add a stop/checkpoint between them?`);
  }

  if (out.length === 0) console.log(`${file}: ${steps.length} step(s), no findings.`);
  else flush(); // workflow lint never fails the run
  process.exit(0);
}

/* ─────────────────────────────── main ─────────────────────────────────── */

const [, , cmd, ...args] = process.argv;
switch (cmd) {
  case 'check': cmdCheck(args[0]); break;
  case 'verbs': cmdVerbs(args.includes('--json')); break;
  case 'workflow': cmdWorkflow(args[0]); break;
  default:
    console.log(`apsl-lint — advisory linter for APSL contract blocks

Usage:
  apsl-lint check [skills-dir]     validate SKILL.md contract blocks (default ./skills)
  apsl-lint workflow <file.md>     scan a prose workflow for likely intent bugs
  apsl-lint verbs [--json]         list installed verbs (project > user > apsl-core)

Contracts are advisory. Warnings never block; only malformed contracts exit non-zero.`);
    process.exit(cmd ? 2 : 0);
}
