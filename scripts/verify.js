#!/usr/bin/env node
'use strict';

// Receivables Design Harness gate checker.
// Spec: gates.md (sections A–E). Thresholds and lists: harness/rules.yaml.
// Read-only: reads YAML front matter, file existence and state.json. Never edits files.
//
// Usage: node scripts/verify.js --run runs/<slug> --gate G1|G2|G3|G4|G5 [--root <project root>]
// Exit codes: 0 pass · 1 fail (one return_stage) · 2 halt

const fs = require('fs');
const path = require('path');

let yaml = null;
try {
  yaml = require('js-yaml');
} catch (e) {
  yaml = null;
}

class Halt extends Error {}

// ---------- small helpers ----------

const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => typeof v === 'string' && v.trim().length > 0;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch (e) {
    return false;
  }
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch (e) {
    return false;
  }
}

function listFiles(dir) {
  if (!isDir(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (isDir(full)) out.push(...listFiles(full));
    else if (isFile(full)) out.push(full);
  }
  return out;
}

function check(id, pass, detail, returnStage) {
  return { id, pass: Boolean(pass), detail, return_stage: pass ? null : returnStage };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Case-insensitive exact phrase match with non-alphanumeric boundaries.
function containsPhrase(text, phrase) {
  const re = new RegExp('(^|[^a-z0-9])' + escapeRegExp(phrase.toLowerCase()) + '($|[^a-z0-9])');
  return re.test(String(text).toLowerCase());
}

function toPence(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v * 100);
  if (typeof v === 'string') {
    const s = v.replace(/[£,\s]/g, '');
    if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
    return Math.round(parseFloat(s) * 100);
  }
  return null;
}

function slugify(heading) {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 _-]/g, '')
    .replace(/ /g, '-');
}

function urlHostAllowed(u, allow) {
  try {
    const host = new URL(u).hostname.toLowerCase();
    return allow.some((a) => host === a || host.endsWith('.' + a));
  } catch (e) {
    return false;
  }
}

function figmaFileKey(u) {
  const m = String(u).match(/figma\.com\/(?:file|design|proto|board|slides|make)\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

function collectStrings(value, out) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (isObj(value)) Object.values(value).forEach((v) => collectStrings(v, out));
  return out;
}

function findEmails(text) {
  return String(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
}

function findPhones(text, minDigits) {
  const candidates = String(text).match(/\+?\d[\d\s().-]{6,}\d/g) || [];
  return candidates.filter(
    (s) => s.replace(/\D/g, '').length >= minDigits && !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())
  );
}

function earliestStage(stages, order) {
  let best = null;
  for (const s of stages) {
    if (!s) continue;
    const idx = order.indexOf(s);
    if (idx === -1) continue;
    if (best === null || idx < order.indexOf(best)) best = s;
  }
  return best;
}

// ---------- context ----------

function readYamlFile(file) {
  if (!isFile(file)) throw new Halt(`Missing file: ${file}`);
  try {
    return yaml.load(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Halt(`YAML parse error in ${file}: ${e.message}`);
  }
}

function parseFrontMatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!m) throw new Halt(`No YAML front matter: ${file}`);
  let data;
  try {
    data = yaml.load(m[1]);
  } catch (e) {
    throw new Halt(`Front matter parse error in ${file}: ${e.message}`);
  }
  if (!isObj(data)) throw new Halt(`Front matter is not a mapping: ${file}`);
  return { data, text };
}

function makeContext(root, runDir, rules) {
  const cache = new Map();
  const ctx = {
    root,
    runDir,
    rules,
    inputsDir: path.join(runDir, 'inputs'),
    exists(rel) {
      return isFile(path.join(runDir, rel));
    },
    fm(rel) {
      if (!cache.has(rel)) {
        const file = path.join(runDir, rel);
        if (!isFile(file)) throw new Halt(`Missing required output: ${path.relative(root, file)}`);
        cache.set(rel, parseFrontMatter(file));
      }
      return cache.get(rel).data;
    },
    state() {
      const file = path.join(runDir, 'state.json');
      if (!isFile(file)) throw new Halt(`Missing state.json: ${path.relative(root, file)}`);
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (e) {
        throw new Halt(`state.json parse error: ${e.message}`);
      }
    },
    sampleAccounts() {
      if (!cache.has('__sample')) cache.set('__sample', parseSampleData(root, rules));
      return cache.get('__sample');
    },
    figmaNodeIds() {
      const fo = ctx.fm('p3-design/figma-output.md');
      return new Set(arr(fo.frames).map((f) => String(f && f.node_id)));
    },
    blocklist() {
      const file = path.join(root, rules.lists.company_blocklist.file);
      if (!isFile(file)) throw new Halt(`Company blocklist missing: ${rules.lists.company_blocklist.file}`);
      return fs
        .readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('#'));
    },
    approvedBrIds() {
      const sm = ctx.fm(rules.business_rules.approved_list.file);
      return new Set(arr(sm[rules.business_rules.approved_list.key]).map((b) => String(b && b.id)));
    },
  };
  return ctx;
}

function parseSampleData(root, rules) {
  const file = path.join(root, rules.lists.name_allowlist.source);
  if (!isFile(file)) throw new Halt(`Missing sample data: ${rules.lists.name_allowlist.source}`);
  const accounts = [];
  let inQueue = false;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (/^##\s+Queue dataset/i.test(line)) {
      inQueue = true;
      continue;
    }
    if (inQueue && /^##\s/.test(line)) break;
    if (!inQueue || !line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
    if (cells.length < 4 || /^:?-+:?$/.test(cells[0]) || cells[0].toLowerCase() === 'account') continue;
    const total = toPence(cells[2]);
    const invoices = parseInt(cells[3], 10);
    if (total === null || Number.isNaN(invoices)) continue;
    accounts.push({
      client: cells[0],
      pets: cells[1].split(',').map((s) => s.trim()).filter(Boolean),
      total,
      invoices,
    });
  }
  if (accounts.length === 0) throw new Halt('Could not parse the queue dataset in sample-data.md');
  return accounts;
}

function sectionIds(file) {
  const ids = new Set();
  const text = fs.readFileSync(file, 'utf8');
  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch && yaml) {
    try {
      const data = yaml.load(fmMatch[1]);
      if (isObj(data)) Object.keys(data).forEach((k) => ids.add(k));
    } catch (e) {
      // ignore: evidence simply will not resolve
    }
  }
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      const explicit = h[1].match(/\{#([^}]+)\}\s*$/);
      if (explicit) ids.add(explicit[1]);
      ids.add(slugify(h[1].replace(/\{#[^}]+\}\s*$/, '')));
    }
    const re = /id="([^"]+)"/g;
    let m;
    while ((m = re.exec(line)) !== null) ids.add(m[1]);
  }
  return ids;
}

function evidenceValid(ref, ctx) {
  if (!str(ref)) return false;
  if (ref.startsWith('figma:')) return ctx.figmaNodeIds().has(ref.slice('figma:'.length).trim());
  const hash = ref.indexOf('#');
  if (hash <= 0) return false;
  const rel = ref.slice(0, hash);
  const sec = ref.slice(hash + 1);
  if (!sec) return false;
  for (const f of [path.resolve(ctx.root, rel), path.resolve(ctx.runDir, rel)]) {
    if (isFile(f) && sectionIds(f).has(sec)) return true;
  }
  return false;
}

function sourceExists(src, ctx) {
  if (!str(src)) return false;
  const rel = src.split('#')[0];
  const full = [path.resolve(ctx.root, rel), path.resolve(ctx.runDir, rel)].find(isFile);
  if (!full) return false;
  const refDir = path.resolve(ctx.root, ctx.rules.paths.references_dir);
  return full.startsWith(refDir + path.sep) || full.startsWith(ctx.inputsDir + path.sep);
}

// ---------- shared domain checks ----------

function transitionFindings(ctx) {
  const sm = ctx.fm('p2-workflow/state-model.md');
  const t = arr(sm.transitions).filter(isObj);
  const tc = ctx.rules.workflow.transition_checks;
  const findings = [];
  const find = (action, appliesTo) =>
    t.filter((x) => x.action === action && (appliesTo === undefined || x.applies_to === appliesTo));

  const sr = tc.sensitive_reminder;
  const sensitive = find(sr.action, sr.applies_to);
  if (sensitive.length === 0) findings.push({ cond: 'c', msg: `no '${sr.action}' transition with applies_to: ${sr.applies_to}` });
  for (const x of sensitive) {
    const ok = sr.pass_if_any.some((cond) => Object.entries(cond).every(([k, v]) => arr(x[k]).includes(v)));
    if (!ok) findings.push({ cond: 'c', msg: `'${sr.action}' for sensitive accounts has neither requires: note_reviewed nor shows: sensitivity_notice` });
  }

  const unchangedRule = (cond, rule) => {
    for (const action of rule.actions) {
      const list = find(action);
      if (list.length === 0) findings.push({ cond, msg: `no '${action}' transition` });
      for (const x of list) {
        const missing = rule.must_be_unchanged.filter((k) => !arr(x.unchanged).includes(k));
        if (missing.length) findings.push({ cond, msg: `'${action}' does not keep unchanged: ${missing.join(', ')}` });
        if (cond === 'd' && isObj(x.sets) && 'workflow_status' in x.sets && x.sets.workflow_status !== 'active') {
          findings.push({ cond, msg: `'${action}' sets workflow_status to ${x.sets.workflow_status}` });
        }
      }
    }
  };
  unchangedRule('d', tc.keep_in_queue);
  unchangedRule('archive', tc.archive_is_not_financial);

  const lq = tc.leave_queue_on_payment;
  const paid = find(lq.action);
  if (paid.length === 0) findings.push({ cond: 'e', msg: `no '${lq.action}' transition` });
  for (const x of paid) {
    const ok = Object.entries(lq.must_set).every(([k, v]) => isObj(x.sets) && x.sets[k] === v);
    if (!ok) findings.push({ cond: 'e', msg: `'${lq.action}' does not set ${JSON.stringify(lq.must_set)}` });
  }
  return findings;
}

function badgeMappingFindings(ctx) {
  const cs = ctx.fm('p3-design/component-states.md');
  const fam = ctx.rules.workflow.status_families;
  const d = ctx.rules.design;
  const findings = [];
  for (const b of arr(cs.badges)) {
    if (!isObj(b)) continue;
    const label = String(b.label || '').trim();
    const family = b.family;
    if (family === 'financial') {
      if (fam.payment_activity.includes(label)) findings.push(`payment activity '${label}' used as financial status`);
      else if (fam.workflow.includes(label) || d.archived_labels.includes(label)) findings.push(`'${label}' used as financial status`);
      else if (!fam.financial.includes(label)) findings.push(`'${label}' is not a financial status`);
    } else if (d.status_badge_families.includes(family) && !fam[family].includes(label)) {
      findings.push(`'${label}' is not in the ${family} list`);
    }
    const paidLanguage = /\bpaid\b|payment (received|successful|complete)/i.test(label);
    const allowedPaid = (family === 'financial' && label === 'Paid') || label === 'Payment confirmed';
    if (paidLanguage && !allowedPaid) findings.push(`payment-success language '${label}' outside Payment confirmed`);
  }
  return findings;
}

function unapprovedBrs(ctx, files) {
  const approved = ctx.approvedBrIds();
  const key = ctx.rules.business_rules.used_list_key;
  const bad = [];
  const missingKey = [];
  for (const rel of files) {
    const data = ctx.fm(rel);
    if (!Array.isArray(data[key])) {
      missingKey.push(rel);
      continue;
    }
    for (const id of data[key]) if (!approved.has(String(id))) bad.push(`${id} (${rel})`);
  }
  return { bad, missingKey };
}

function uiCopyTexts(ctx) {
  const fo = ctx.fm('p3-design/figma-output.md');
  return arr(fo.ui_copy).map((x) => String((x && x.text) || ''));
}

function judgementIssues(entries, ids, ctx) {
  const verdicts = ctx.rules.qa.verdicts;
  const byId = new Map();
  for (const e of arr(entries)) if (isObj(e)) byId.set(String(e.id), e);
  const missing = ids.filter((id) => !byId.has(String(id)));
  const extra = [...byId.keys()].filter((id) => !ids.map(String).includes(id));
  const badVerdict = [];
  const badEvidence = [];
  const failed = [];
  for (const id of ids) {
    const e = byId.get(String(id));
    if (!e) continue;
    if (!verdicts.includes(e.verdict)) badVerdict.push(id);
    const ev = arr(e.evidence);
    if (ev.length === 0 || !ev.every((r) => evidenceValid(r, ctx))) badEvidence.push(id);
    if (e.verdict === 'Fail') failed.push(String(id));
  }
  return { missing, extra, badVerdict, badEvidence, failed };
}

function failedReturnStage(ctx, ids, fallback) {
  const fc = ctx.fm('p4-validation/failed-criteria.md');
  const stages = arr(fc.failures)
    .filter((f) => isObj(f) && ids.includes(String(f.id)))
    .map((f) => f.return_stage);
  return earliestStage(stages, ctx.rules.return_rules.order) || fallback;
}

// ---------- gates ----------

const GATES = {
  G1(ctx) {
    const r = ctx.rules;
    const c = [];
    const summary = ctx.fm('p1-evidence/evidence-summary.md');
    const reqs = arr(ctx.fm('p1-evidence/requirements.md').requirements).filter(isObj);
    const questions = arr(ctx.fm('p1-evidence/open-questions.md').questions).filter(isObj);

    const read = new Set(arr(summary.sources_read).map(String));
    const notRead = r.reference_documents.filter((d) => !read.has(d));
    c.push(check('G1-1', notRead.length === 0, notRead.length ? `not read: ${notRead.join(', ')}` : `${r.reference_documents.length} reference documents read`, 'P1'));

    const inputs = listFiles(ctx.inputsDir);
    c.push(check('G1-2', inputs.length >= r.change_inputs.min_files, `${inputs.length} change input file(s)`, 'P1'));

    const ids = reqs.map((q) => q.id);
    const noId = ids.filter((id) => !str(String(id === undefined || id === null ? '' : id))).length;
    const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
    c.push(check('G1-3', reqs.length > 0 && noId === 0 && dups.length === 0, `${reqs.length} requirements, ${noId} without ID, duplicates: ${[...new Set(dups)].join(', ') || 'none'}`, 'P1'));

    const badLabel = reqs.filter((q) => !r.requirements.labels.includes(q.label)).map((q) => q.id);
    c.push(check('G1-4', badLabel.length === 0, badLabel.length ? `invalid or missing label: ${badLabel.join(', ')}` : 'every requirement has exactly one label', 'P1'));

    const badEvidence = reqs
      .filter((q) => q.label === r.requirements.evidence_label)
      .filter((q) => arr(q.sources).length < r.requirements.min_sources_for_evidence || !arr(q.sources).every((s) => sourceExists(s, ctx)))
      .map((q) => q.id);
    c.push(check('G1-5', badEvidence.length === 0, badEvidence.length ? `Evidence without a source file in references/ or inputs/: ${badEvidence.join(', ')}` : 'every Evidence has a source', 'P1'));

    const asked = new Set(questions.map((q) => String(q.requirement_id)));
    const unasked = reqs.filter((q) => r.requirements.labels_requiring_open_question.includes(q.label) && !asked.has(String(q.id))).map((q) => q.id);
    c.push(check('G1-6', unasked.length === 0, unasked.length ? `Conflict/Unknown missing from open-questions: ${unasked.join(', ')}` : 'all Conflict/Unknown listed', 'P1'));
    return c;
  },

  G2(ctx) {
    const w = ctx.rules.workflow;
    const c = [];
    const ia = ctx.fm('p2-workflow/information-architecture.md');
    const uf = ctx.fm('p2-workflow/user-flow.md');
    const sm = ctx.fm('p2-workflow/state-model.md');
    const objects = isObj(sm.objects) ? sm.objects : {};
    const fieldNames = (o) => {
      if (!isObj(o)) return [];
      if (Array.isArray(o.fields)) return o.fields.map((f) => (isObj(f) ? f.name : f)).map(String);
      if (isObj(o.fields)) return Object.keys(o.fields);
      return [];
    };

    c.push(check('G2-1', fieldNames(objects.account).length > 0, 'account object defined', 'P2'));
    c.push(check('G2-2', fieldNames(objects.invoice).length > 0, 'invoice object defined', 'P2'));
    c.push(check('G2-3', fieldNames(objects.invoice).includes(w.invoice_required_field), `invoice has ${w.invoice_required_field}`, 'P2'));

    const fams = isObj(sm.status_families) ? sm.status_families : {};
    const famIssues = [];
    for (const name of Object.keys(w.status_families)) {
      const list = arr(fams[name]).map(String);
      if (list.length === 0) famIssues.push(`${name} list missing`);
      const outside = list.filter((l) => !w.status_families[name].includes(l));
      if (outside.length) famIssues.push(`${name} has labels outside PRD list: ${outside.join(', ')}`);
    }
    c.push(check('G2-4', famIssues.length === 0, famIssues.join('; ') || '3 separate status families', 'P2'));

    const seen = new Map();
    const overlaps = [];
    for (const name of Object.keys(w.status_families)) {
      for (const l of arr(fams[name]).map(String)) {
        if (seen.has(l) && seen.get(l) !== name) overlaps.push(l);
        seen.set(l, name);
      }
    }
    c.push(check('G2-5', overlaps.length === 0, overlaps.length ? `labels in two families: ${overlaps.join(', ')}` : 'no shared labels', 'P2'));

    const sections = arr(ia.sections).map((s) => String(s).toLowerCase());
    const badSections = w.required_ia_sections.filter((s) => sections.filter((x) => x === s).length !== 1);
    c.push(check('G2-6', badSections.length === 0, badSections.length ? `not exactly one section: ${badSections.join(', ')}` : 'search, filter, sort separate', 'P2'));

    const scenarios = arr(uf.scenarios).filter(isObj);
    const openEnded = scenarios.filter((s) => !str(s.start_state) || !str(s.end_state)).map((s) => s.id);
    c.push(check('G2-7', scenarios.length > 0 && openEnded.length === 0, `${scenarios.length} scenarios; missing start/end: ${openEnded.join(', ') || 'none'}`, 'P2'));

    const brs = arr(sm[ctx.rules.business_rules.approved_list.key]).filter(isObj);
    const pattern = new RegExp(ctx.rules.business_rules.id_pattern);
    const brIds = brs.map((b) => String(b.id));
    const badIds = brIds.filter((id, i) => !pattern.test(id) || brIds.indexOf(id) !== i);
    c.push(check('G2-8', brs.length > 0 && badIds.length === 0, `${brs.length} approved business rules; invalid/duplicate IDs: ${badIds.join(', ') || 'none'}`, 'P2'));

    const noSource = brs.filter((b) => !str(b.source) || !str(b.rule)).map((b) => b.id);
    c.push(check('G2-9', noSource.length === 0, noSource.length ? `BR without rule or source: ${noSource.join(', ')}` : 'every BR has a source', 'P2'));

    const tf = transitionFindings(ctx);
    c.push(check('G2-10', tf.length === 0, tf.map((f) => `${f.cond}: ${f.msg}`).join('; ') || 'transitions satisfy c, d, e and archive rules', 'P2'));
    return c;
  },

  G3(ctx) {
    const d = ctx.rules.design;
    const c = [];
    const state = ctx.state();
    if (!isObj(state.figma_destination) || !str(state.figma_destination.file_key)) {
      throw new Halt('figma_destination is null; G3 not run');
    }
    const si = ctx.fm('p3-design/screen-inventory.md');
    const fo = ctx.fm('p3-design/figma-output.md');
    const summary = ctx.fm('p1-evidence/evidence-summary.md');

    const kf = arr(si.key_frames).filter(isObj);
    const kfNames = kf.map((f) => String(f.name));
    const kfMissing = d.key_frames.filter((n) => !kfNames.includes(n));
    c.push(check('G3-1', kf.length === d.key_frames.length && kfMissing.length === 0, `${kf.length} key frames; missing: ${kfMissing.join(', ') || 'none'}`, 'P3'));

    const st = arr(si.states).filter(isObj);
    const stNames = st.map((s) => String(s.name));
    const stMissing = d.states.filter((n) => !stNames.includes(n));
    c.push(check('G3-2', st.length === d.states.length && stMissing.length === 0, `${st.length} states; missing: ${stMissing.join(', ') || 'none'}`, 'P3'));

    const required = [...d.key_frames, ...d.states];
    const frameNames = arr(fo.frames).filter(isObj).map((f) => String(f.name));
    const notTraced = required.filter((n) => !(kfNames.includes(n) || stNames.includes(n)) || !frameNames.includes(n));
    c.push(check('G3-3', required.length === d.total_named_states && notTraced.length === 0, `not traceable in both files: ${notTraced.join(', ') || 'none'}`, 'P3'));

    const scen = new Set(arr(si.accounts_shown).filter(isObj).map((a) => String(a.scenario)));
    const scenMissing = d.account_scenarios.filter((s) => !scen.has(s));
    c.push(check('G3-4', scenMissing.length === 0, `account scenarios missing: ${scenMissing.join(', ') || 'none'}`, 'P3'));

    const badWidth = kf.filter((f) => Number(f.width) !== d.key_frame_width).map((f) => f.name);
    c.push(check('G3-5', kf.length > 0 && badWidth.length === 0, `key frames not ${d.key_frame_width}px: ${badWidth.join(', ') || 'none'}`, 'P3'));

    c.push(check('G3-6', si.account_detail_layout === d.account_detail.layout, `account detail layout ${si.account_detail_layout} (required: ${d.account_detail.layout})`, 'P3'));

    const allow = ctx.rules.lists.url_allowlist;
    c.push(check('G3-7', str(fo.file_url) && urlHostAllowed(fo.file_url, allow), `file_url ${fo.file_url}`, 'P3'));

    const frames = arr(fo.frames).filter(isObj);
    const badFrames = frames.filter((f) => !str(String(f.name || '')) || !str(String(f.node_id || '')));
    c.push(check('G3-8', frames.length > 0 && badFrames.length === 0, `${frames.length} frames recorded`, 'P3'));

    const cs = ctx.fm('p3-design/component-states.md');
    const actions = arr(cs.actions).filter(isObj);
    const actionIssues = [];
    for (const a of d.main_actions) {
      const entry = actions.find((x) => x.name === a);
      if (!entry) actionIssues.push(`${a} missing`);
      else {
        const missing = d.action_states.filter((s) => !arr(entry.states).includes(s));
        if (missing.length) actionIssues.push(`${a} missing ${missing.join('/')}`);
      }
    }
    c.push(check('G3-9', actionIssues.length === 0, actionIssues.join('; ') || '4 actions × 4 states', 'P3'));

    const mappings = badgeMappingFindings(ctx);
    c.push(check('G3-10', mappings.length === 0, mappings.join('; ') || 'no forbidden status mappings', 'P3'));

    const badges = arr(cs.badges).filter(isObj);
    const unlabeled = badges.filter((b) => !d.badge_families.includes(b.family) || (d.status_badge_families.includes(b.family) && !str(String(b.label || ''))));
    c.push(check('G3-11', unlabeled.length === 0, `${unlabeled.length} status badge(s) without label or with unknown family`, 'P3'));

    const key = ctx.rules.business_rules.used_list_key;
    const noBr = ['p3-design/design-concept.md', 'p3-design/screen-inventory.md'].filter((rel) => !Array.isArray(ctx.fm(rel)[key]));
    c.push(check('G3-12', noBr.length === 0, noBr.length ? `${key} missing in: ${noBr.join(', ')}` : `${key} present`, 'P3'));

    const dest = state.figma_destination.file_key;
    const destIssues = [];
    if (String(fo.file_key) !== dest) destIssues.push(`file_key ${fo.file_key} ≠ destination ${dest}`);
    const offFile = frames.filter((f) => figmaFileKey(f.url) !== dest).map((f) => f.name);
    if (offFile.length) destIssues.push(`frames outside destination: ${offFile.join(', ')}`);
    if (arr(summary.figma_reference_keys).map(String).includes(dest)) destIssues.push('destination equals a reference Figma file');
    c.push(check('G3-13', destIssues.length === 0, destIssues.join('; ') || 'all frames in destination file', 'P3'));
    return c;
  },

  G4(ctx) {
    const r = ctx.rules;
    const c = [];
    const blocklist = ctx.blocklist(); // Halt if missing
    const qa = ctx.fm('p4-validation/qa-report.md');
    ctx.fm('p4-validation/failed-criteria.md');
    ctx.fm('p4-validation/revision-log.md');
    const si = ctx.fm('p3-design/screen-inventory.md');
    const texts = uiCopyTexts(ctx);

    // ① ② Critical acceptance criteria
    const cac = judgementIssues(qa.critical_acceptance, r.qa.critical_acceptance_ids, ctx);
    const cacStructOk = cac.missing.length === 0 && cac.extra.length === 0 && cac.badVerdict.length === 0;
    c.push(check('G4-1a', cacStructOk, `critical_acceptance missing: ${cac.missing.join(', ') || 'none'}; extra: ${cac.extra.join(', ') || 'none'}; bad verdict: ${cac.badVerdict.join(', ') || 'none'}`, 'P4'));
    c.push(check('G4-1b', cac.badEvidence.length === 0, `critical_acceptance without resolvable evidence: ${cac.badEvidence.join(', ') || 'none'}`, 'P3'));
    c.push(check('G4-2', cac.failed.length === 0, `Critical AC Fail: ${cac.failed.join(', ') || '0'}`, cac.failed.length ? failedReturnStage(ctx, cac.failed, 'P3') : null));

    // ③ ④ Critical service conditions
    const csc = judgementIssues(qa.critical_service_conditions, r.qa.critical_service_condition_ids, ctx);
    const cscStructOk = csc.missing.length === 0 && csc.extra.length === 0 && csc.badVerdict.length === 0;
    c.push(check('G4-3a', cscStructOk, `critical_service_conditions missing: ${csc.missing.join(', ') || 'none'}; extra: ${csc.extra.join(', ') || 'none'}; bad verdict: ${csc.badVerdict.join(', ') || 'none'}`, 'P4'));
    c.push(check('G4-3b', csc.badEvidence.length === 0, `service conditions without resolvable evidence: ${csc.badEvidence.join(', ') || 'none'}`, 'P3'));
    c.push(check('G4-4', csc.failed.length === 0, `Critical service condition Fail: ${csc.failed.join(', ') || '0'}`, csc.failed.length ? failedReturnStage(ctx, csc.failed, 'P3') : null));

    const judgemental = texts.filter((t) => r.lists.judgemental_phrases.values.some((p) => containsPhrase(t, p)));
    c.push(check('G4-4a', judgemental.length === 0, `judgemental phrases in ui_copy: ${judgemental.length}`, 'P3'));

    const cs = ctx.fm('p3-design/component-states.md');
    const archivedGreen = arr(cs.badges)
      .filter(isObj)
      .filter((b) => r.design.archived_labels.includes(String(b.label)))
      .filter((b) => r.design.success_token_markers.some((m) => String(b.token || '').toLowerCase().includes(m)));
    c.push(check('G4-4b', archivedGreen.length === 0, `archived badges with green/success token: ${archivedGreen.length}`, 'P3'));

    const tf = transitionFindings(ctx);
    for (const cond of ['c', 'd', 'e']) {
      const f = tf.filter((x) => x.cond === cond);
      c.push(check(`G4-4${cond}`, f.length === 0, f.map((x) => x.msg).join('; ') || `transition layer ok for ${cond}`, 'P2'));
    }
    const confirmedClients = ctx.sampleAccounts().filter((a) => a.invoices === 0).map((a) => a.client);
    const stillActive = arr(si.accounts_shown)
      .filter(isObj)
      .filter((a) => confirmedClients.includes(String(a.client)) && String(a.workflow_status).toLowerCase() === 'active');
    c.push(check('G4-4e2', stillActive.length === 0, `payment-confirmed accounts shown as active: ${stillActive.map((a) => a.client).join(', ') || 'none'}`, 'P3'));

    // ⑤ totals reconcile and match sample data
    const sample = ctx.sampleAccounts();
    const totalIssues = [];
    for (const a of arr(si.accounts_shown).filter(isObj)) {
      const amounts = arr(a.invoice_amounts).map(toPence);
      const total = toPence(a.total);
      if (total === null || amounts.some((x) => x === null)) {
        totalIssues.push(`${a.client}: unreadable amount`);
        continue;
      }
      const sum = amounts.reduce((s, x) => s + x, 0);
      if (sum !== total) totalIssues.push(`${a.client}: total ${total / 100} ≠ invoice sum ${sum / 100}`);
      const ref = sample.find((s) => s.client === a.client);
      if (ref && ref.total !== total) totalIssues.push(`${a.client}: total ${total / 100} ≠ sample-data ${ref.total / 100}`);
      if (ref && ref.invoices !== amounts.length) totalIssues.push(`${a.client}: ${amounts.length} invoices ≠ sample-data ${ref.invoices}`);
    }
    c.push(check('G4-5', totalIssues.length === 0, totalIssues.join('; ') || 'totals reconcile (£0.00 difference)', 'P3'));

    // ⑥ forbidden status mappings
    const mappings = badgeMappingFindings(ctx);
    c.push(check('G4-6', mappings.length === 0, mappings.join('; ') || 'no forbidden status mappings', 'P3'));

    // ⑦ names
    const allowedClients = sample.map((s) => s.client);
    const allowedPets = sample.flatMap((s) => s.pets);
    const badNames = [];
    for (const a of arr(si.accounts_shown).filter(isObj)) {
      if (!allowedClients.includes(String(a.client))) badNames.push(`client ${a.client}`);
      for (const p of arr(a.pets)) if (!allowedPets.includes(String(p))) badNames.push(`pet ${p}`);
    }
    c.push(check('G4-7', badNames.length === 0, `names not in sample-data: ${badNames.join(', ') || 'none'}`, 'P3'));

    // ⑧ PII, blocklisted companies in ui_copy; URL allowlist in all front matter
    const minDigits = r.lists.pii_patterns.phone_min_digits;
    const pii = [];
    for (const t of texts) {
      findEmails(t).forEach((e) => pii.push(`email ${e}`));
      findPhones(t, minDigits).forEach((p) => pii.push(`phone ${p}`));
      blocklist.filter((name) => containsPhrase(t, name)).forEach(() => pii.push('blocklisted company name'));
    }
    c.push(check('G4-8a', pii.length === 0, `PII or blocklisted names in ui_copy: ${pii.length}`, 'P3'));

    const urlIssues = [];
    let urlStage = null;
    for (const stage of r.stages.slice(0, 4)) {
      for (const rel of stage.required_outputs) {
        if (!ctx.exists(rel)) continue;
        for (const s of collectStrings(ctx.fm(rel), [])) {
          for (const u of s.match(/https?:\/\/[^\s)>"']+/g) || []) {
            if (!urlHostAllowed(u, r.lists.url_allowlist)) {
              urlIssues.push(`${u} (${rel})`);
              urlStage = earliestStage([urlStage, stage.id], r.return_rules.order);
            }
          }
        }
      }
    }
    c.push(check('G4-8b', urlIssues.length === 0, `non-allowlisted URLs: ${urlIssues.join(', ') || 'none'}`, urlStage || 'P3'));

    // ⑨ AI phrases
    const ai = texts.filter((t) => r.lists.ai_phrases.values.some((p) => containsPhrase(t, p)));
    c.push(check('G4-9', ai.length === 0, `AI phrases in ui_copy: ${ai.length}`, 'P3'));

    // ⑩ business rules
    const br = unapprovedBrs(ctx, ['p3-design/design-concept.md', 'p3-design/screen-inventory.md']);
    c.push(check('G4-10', br.bad.length === 0 && br.missingKey.length === 0, `unapproved BR: ${br.bad.join(', ') || 'none'}; missing list: ${br.missingKey.join(', ') || 'none'}`, 'P2'));

    // ⑪ standard, ⑫ needs human review
    const standard = arr(qa.standard).filter(isObj);
    const badStd = standard.filter((s) => !r.qa.verdicts.includes(s.verdict));
    const stdFails = standard.filter((s) => s.verdict === 'Fail').length;
    c.push(check('G4-11', standard.length === r.qa.standard_count && badStd.length === 0, `${standard.length}/${r.qa.standard_count} standard judgements; ${stdFails} Standard Fail recorded (does not stop the run)`, 'P4'));

    const nhr = arr(qa.needs_human_review).filter(isObj);
    const nhrOk = nhr.length === r.qa.needs_human_review_count && nhr.every((n) => str(String(n.question || '')));
    c.push(check('G4-12', nhrOk, `${nhr.length}/${r.qa.needs_human_review_count} Needs Human Review items listed`, 'P4'));

    // ⑬ identifiers
    const idRe = new RegExp(r.lists.identifier_pattern, 'g');
    const unlisted = [];
    for (const t of texts) for (const m of t.match(idRe) || []) if (!r.lists.identifier_allowlist.includes(m)) unlisted.push(m);
    c.push(check('G4-13', unlisted.length === 0, `identifiers not in sample-data: ${unlisted.join(', ') || 'none'}`, 'P3'));

    // ⑭ data safety review
    const ds = qa[r.qa.data_safety_review.key];
    if (!isObj(ds) || !r.qa.verdicts.includes(ds.verdict)) {
      c.push(check('G4-14', false, 'data_safety_review missing or invalid', 'P4'));
    } else {
      const ok = ds.verdict === 'Pass' && arr(ds.evidence).length > 0 && arr(ds.evidence).every(str);
      c.push(check('G4-14', ok, `data_safety_review ${ds.verdict}, ${arr(ds.evidence).length} evidence`, 'P3'));
    }
    return c;
  },

  G5(ctx) {
    const r = ctx.rules;
    const g5 = r.return_rules.g5;
    const c = [];
    const files = ['p5-handoff/handoff.md', 'p5-handoff/implementation-notes.md', 'p5-handoff/unresolved-questions.md'];
    const missing = files.filter((f) => !ctx.exists(f));
    c.push(check('G5-1', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : '3 handoff files exist', g5.handoff_file_missing));
    if (missing.length) return c;

    const handoff = ctx.fm(files[0]);
    const notes = ctx.fm(files[1]);
    const uq = ctx.fm(files[2]);

    const screens = arr(handoff.screens).filter(isObj);
    const required = [...r.design.key_frames, ...r.design.states];
    const noLink = required.filter((n) => {
      const s = screens.find((x) => x.name === n);
      return !s || !str(s.figma_url) || !urlHostAllowed(s.figma_url, r.lists.url_allowlist);
    });
    c.push(check('G5-2', noLink.length === 0, `screens without Figma link: ${noLink.join(', ') || 'none'}`, g5.screen_without_figma_link));

    const ruled = arr(notes.interaction_rules).filter(isObj).map((x) => x.action);
    const noRule = r.design.main_actions.filter((a) => !ruled.includes(a));
    c.push(check('G5-3', noRule.length === 0, `actions without interaction rule: ${noRule.join(', ') || 'none'}`, g5.action_without_interaction_rule));

    const questions = Array.isArray(uq.questions) ? uq.questions : null;
    const orphan = questions === null ? ['questions list missing'] : questions.filter((q) => !isObj(q) || (!str(q.owner) && !str(q.next_step))).map((q) => (isObj(q) ? q.id : String(q)));
    c.push(check('G5-4', orphan.length === 0, `questions without owner or next step: ${orphan.join(', ') || 'none'}`, g5.unresolved_question_without_owner_or_next_step));

    const qa = ctx.fm('p4-validation/qa-report.md');
    const failed = [...arr(qa.critical_acceptance), ...arr(qa.critical_service_conditions)]
      .filter((e) => isObj(e) && e.verdict === 'Fail')
      .map((e) => String(e.id));
    c.push(check('G5-5', failed.length === 0, `Critical QA Fail: ${failed.join(', ') || '0'}`, failed.length ? failedReturnStage(ctx, failed, 'P3') : null));

    const br = unapprovedBrs(ctx, [files[0], files[1]]);
    c.push(check('G5-6', br.bad.length === 0 && br.missingKey.length === 0, `unapproved BR: ${br.bad.join(', ') || 'none'}; missing list: ${br.missingKey.join(', ') || 'none'}`, g5.unapproved_business_rule));
    return c;
  },
};

// ---------- main ----------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run') args.run = argv[++i];
    else if (a === '--gate') args.gate = argv[++i];
    else if (a === '--root') args.root = argv[++i];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const out = { gate: args.gate || null, result: 'halt', checks: [], return_stage: null };
  let code = 2;
  try {
    if (!yaml) throw new Halt('js-yaml is not installed. Run npm install.');
    if (!args.run || !args.gate) throw new Halt('Usage: node scripts/verify.js --run runs/<slug> --gate G1|G2|G3|G4|G5');
    if (!Object.prototype.hasOwnProperty.call(GATES, args.gate)) throw new Halt(`Unknown gate: ${args.gate}`);
    const root = path.resolve(args.root || path.join(__dirname, '..'));
    const rules = readYamlFile(path.join(root, 'harness', 'rules.yaml'));
    const runDir = path.resolve(root, args.run);
    if (!isDir(runDir)) throw new Halt(`Run folder not found: ${args.run}`);

    const checks = GATES[args.gate](makeContext(root, runDir, rules));
    out.checks = checks;
    const failed = checks.filter((c) => !c.pass);
    if (failed.length === 0) {
      out.result = 'pass';
      code = 0;
    } else {
      out.result = 'fail';
      out.return_stage = earliestStage(failed.map((c) => c.return_stage), rules.return_rules.order) || 'P3';
      code = 1;
    }
  } catch (e) {
    out.result = 'halt';
    out.detail = e instanceof Halt ? e.message : `Unexpected error: ${e && e.stack ? e.stack : e}`;
    code = 2;
  }
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  process.exitCode = code;
}

if (require.main === module) main();

module.exports = { GATES, parseFrontMatter, parseSampleData, containsPhrase, findPhones, toPence };
