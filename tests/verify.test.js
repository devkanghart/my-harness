'use strict';

// Tests for scripts/verify.js. Run with: npm install && npm test
// Each test builds a fresh fixture project in a temp folder, using the real harness/rules.yaml
// and references/, a fake company blocklist, and a fully valid run that passes G1–G5.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');

const PROJECT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT, 'scripts', 'verify.js');
const RUN = 'runs/test-run';
const DEST = 'DESTKEY456';

const KEY_FRAMES = ['Payments Due default queue', 'Filtered or saved queue view', 'Account detail'];
const STATES = ['Create payment link', 'Send reminder', 'Archive confirmation', 'Archived result and restore', 'Loading', 'Empty queue', 'No results'];
const NAMED = [...KEY_FRAMES, ...STATES];
const ACTIONS = ['Create payment link', 'Send reminder', 'Archive from queue', 'Restore'];
const frameUrl = (i) => `https://www.figma.com/design/${DEST}/Receivables-Workspace-test-run?node-id=1-${i}`;

function validRun() {
  const unchanged = ['workflow_status', 'financial_status'];
  return {
    'p1-evidence/evidence-summary.md': {
      sources_read: [
        'references/PRD.md',
        'references/design.md',
        'references/story-service.md',
        'references/story-work.md',
        'references/acceptance-criteria.md',
        'references/sample-data.md',
      ],
      figma_reference_keys: ['REFKEY123'],
    },
    'p1-evidence/requirements.md': {
      requirements: [
        { id: 'REQ-01', label: 'E', sources: ['references/PRD.md#6-functional-requirements'] },
        { id: 'REQ-02', label: 'E', sources: ['runs/test-run/inputs/uat-feedback.md'] },
        { id: 'REQ-03', label: 'U', sources: [] },
      ],
    },
    'p1-evidence/open-questions.md': { questions: [{ id: 'Q-01', requirement_id: 'REQ-03' }] },
    'p2-workflow/information-architecture.md': { sections: ['search', 'filter', 'sort', 'saved_views'] },
    'p2-workflow/user-flow.md': {
      scenarios: [{ id: 'S-01', start_state: 'Payments Due loaded', end_state: 'Reminder sent; account still active' }],
    },
    'p2-workflow/state-model.md': {
      objects: {
        account: { fields: ['id', 'client_name', 'workflow_status', 'total_outstanding'] },
        invoice: { fields: ['id', 'account_id', 'financial_status', 'amount_outstanding'] },
      },
      status_families: {
        financial: ['Due', 'Overdue', 'Paid', 'Cancelled'],
        payment_activity: ['No payment link', 'Payment link created', 'Payment link sent', 'Payment link expired', 'Reminder sent', 'Payment confirmed'],
        workflow: ['Active in Payments Due', 'Archived from queue'],
      },
      transitions: [
        { action: 'send_reminder', applies_to: 'sensitive', requires: ['note_reviewed'], shows: ['sensitivity_notice'], sets: {}, unchanged },
        { action: 'link_created', applies_to: 'all', requires: [], shows: [], sets: {}, unchanged },
        { action: 'link_sent', applies_to: 'all', requires: [], shows: [], sets: {}, unchanged },
        { action: 'reminder_sent', applies_to: 'all', requires: [], shows: [], sets: {}, unchanged },
        { action: 'payment_confirmed', applies_to: 'all', requires: [], shows: [], sets: { in_active_queue: false }, unchanged: [] },
        { action: 'archive', applies_to: 'all', requires: ['confirmation'], shows: [], sets: { workflow_status: 'archived' }, unchanged: ['financial_status', 'amount_outstanding'] },
        { action: 'restore', applies_to: 'all', requires: [], shows: [], sets: { workflow_status: 'active' }, unchanged: ['financial_status', 'amount_outstanding'] },
      ],
      approved_business_rules: [{ id: 'BR-01', rule: 'Archive never changes financial status.', source: 'references/PRD.md#6-functional-requirements' }],
    },
    'p3-design/design-concept.md': { business_rules_used: ['BR-01'] },
    'p3-design/screen-inventory.md': {
      key_frames: KEY_FRAMES.map((name) => ({ name, width: 1440 })),
      states: STATES.map((name) => ({ name, type: 'state', parent_frame: 'Account detail' })),
      account_detail_layout: 'full_view',
      accounts_shown: [
        { client: 'Amara Lewis', pets: ['Pixel'], scenario: 'link_sent_unpaid', workflow_status: 'active', total: '£486.50', invoice_amounts: ['£186.50', '£220.00', '£80.00'] },
        { client: 'Theo Bennett', pets: ['Miso', 'Nori'], scenario: 'sensitive_account', workflow_status: 'active', total: 1284.0, invoice_amounts: [540, 264, 360, 120] },
        { client: 'Sophie Martin', pets: ['Clover'], scenario: 'no_payment_link', workflow_status: 'active', total: 92.4, invoice_amounts: [92.4] },
        { client: 'Priya Shah', pets: ['Archie'], scenario: 'multiple_invoices', workflow_status: 'active', total: 2430.75, invoice_amounts: [500, 500, 500, 500, 430.75] },
      ],
      business_rules_used: ['BR-01'],
    },
    'p3-design/component-states.md': {
      actions: ACTIONS.map((name) => ({ name, states: ['Default', 'Loading', 'Success', 'Error'] })),
      badges: [
        { family: 'financial', label: 'Overdue', token: 'critical-muted' },
        { family: 'payment_activity', label: 'Payment link sent', token: 'neutral' },
        { family: 'payment_activity', label: 'Payment confirmed', token: 'success' },
        { family: 'workflow', label: 'Archived from queue', token: 'neutral-grey' },
        { family: 'category', label: 'Care plan', token: 'tag' },
      ],
    },
    'p3-design/figma-output.md': {
      file_key: DEST,
      file_url: `https://www.figma.com/design/${DEST}/Receivables-Workspace-test-run`,
      frames: NAMED.map((name, i) => ({ name, node_id: `1:${i + 1}`, url: frameUrl(i + 1) })),
      ui_copy: [
        { frame: 'Payments Due default queue', text: 'Search client, pet or invoice' },
        { frame: 'Account detail', text: 'INV-10428 · £186.50 · Overdue' },
        { frame: 'Archive confirmation', text: 'It does not change the invoices, amounts owed or payment status.' },
      ],
    },
    'p4-validation/qa-report.md': {
      critical_acceptance: Array.from({ length: 12 }, (_, i) => ({
        id: `CAC-${String(i + 1).padStart(2, '0')}`,
        verdict: 'Pass',
        evidence: ['figma:1:1'],
      })),
      critical_service_conditions: ['a', 'b', 'c', 'd', 'e'].map((id) => ({
        id,
        verdict: 'Pass',
        evidence: ['runs/test-run/p3-design/screen-inventory.md#accounts_shown'],
      })),
      standard: Array.from({ length: 28 }, (_, i) => ({ id: `STD-${String(i + 1).padStart(2, '0')}`, verdict: 'Pass', evidence: [] })),
      needs_human_review: [1, 2, 3, 4].map((n) => ({ id: `NHR-${n}`, question: `Final review question ${n}` })),
      data_safety_review: { verdict: 'Pass', evidence: ['figma:1:1'] },
    },
    'p4-validation/failed-criteria.md': { failures: [] },
    'p4-validation/revision-log.md': { entries: [] },
    'p5-handoff/handoff.md': {
      screens: NAMED.map((name, i) => ({ name, figma_url: frameUrl(i + 1) })),
      business_rules_used: ['BR-01'],
    },
    'p5-handoff/implementation-notes.md': {
      interaction_rules: ACTIONS.map((action) => ({ action })),
      business_rules_used: ['BR-01'],
    },
    'p5-handoff/unresolved-questions.md': { questions: [{ id: 'U-01', owner: 'PM', next_step: '' }] },
  };
}

function validState() {
  return {
    slug: 'test-run',
    current_stage: 'P1',
    last_passed_gate: null,
    failure_count: { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 },
    human_approval: { status: 'pending', approved_at: null, approved_file_hashes: {} },
    generated_files: [],
    change_inputs: ['runs/test-run/inputs/uat-feedback.md'],
    return_history: [],
    input_hashes: {},
    rules_hash: '',
    figma_destination: {
      file_key: DEST,
      file_url: `https://www.figma.com/design/${DEST}/Receivables-Workspace-test-run`,
      created_at: '2026-09-29T00:00:00Z',
      source: 'created',
    },
  };
}

// mutate({ run, state, root }) may change the data before files are written.
// Return false from options.blocklist to omit the blocklist file.
function makeFixture(mutate, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'receivables-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.copyFileSync(path.join(PROJECT, 'harness', 'rules.yaml'), path.join(root, 'harness', 'rules.yaml'));
  fs.cpSync(path.join(PROJECT, 'references'), path.join(root, 'references'), { recursive: true });
  if (options.blocklist !== false) {
    fs.writeFileSync(path.join(root, 'harness', 'company-blocklist.local.txt'), '# test names only\nFakeco Vets\nExample Animal Hospital\n');
  }
  const runDir = path.join(root, RUN);
  fs.mkdirSync(path.join(runDir, 'inputs'), { recursive: true });
  fs.writeFileSync(path.join(runDir, 'inputs', 'uat-feedback.md'), '# UAT feedback\n\nArchive meaning is unclear.\n');

  const data = { run: validRun(), state: validState(), root };
  if (mutate) mutate(data);
  for (const [rel, fm] of Object.entries(data.run)) {
    if (fm === null) continue;
    const file = path.join(runDir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `---\n${yaml.dump(fm)}---\n\n# ${path.basename(rel, '.md')}\n`);
  }
  fs.writeFileSync(path.join(runDir, 'state.json'), JSON.stringify(data.state, null, 2));
  return root;
}

function verify(root, gate) {
  const res = spawnSync(process.execPath, [SCRIPT, '--root', root, '--run', RUN, '--gate', gate], { encoding: 'utf8' });
  let json = null;
  try {
    json = JSON.parse(res.stdout);
  } catch (e) {
    json = { parse_error: res.stdout + res.stderr };
  }
  return { code: res.status, json };
}

// ---------- pass ----------

for (const gate of ['G1', 'G2', 'G3', 'G4', 'G5']) {
  test(`${gate} passes on a valid run`, () => {
    const { code, json } = verify(makeFixture(), gate);
    assert.equal(code, 0, JSON.stringify(json, null, 2));
    assert.equal(json.result, 'pass');
  });
}

// ---------- fail ----------

test('G1 fails when a requirement has no valid label → P1', () => {
  const root = makeFixture(({ run }) => {
    run['p1-evidence/requirements.md'].requirements[0].label = 'X';
  });
  const { code, json } = verify(root, 'G1');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P1');
});

test('G1 fails when Evidence cites a file outside references/ and inputs/ → P1', () => {
  const root = makeFixture(({ run }) => {
    run['p1-evidence/requirements.md'].requirements[0].sources = ['somewhere/else.md'];
  });
  const { code, json } = verify(root, 'G1');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P1');
});

test('G2 fails when a sensitive reminder has neither note review nor notice → P2', () => {
  const root = makeFixture(({ run }) => {
    const t = run['p2-workflow/state-model.md'].transitions[0];
    t.requires = [];
    t.shows = [];
  });
  const { code, json } = verify(root, 'G2');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P2');
});

test('G2 passes a sensitive reminder that only shows the notice (PRD 6.7-2)', () => {
  const root = makeFixture(({ run }) => {
    run['p2-workflow/state-model.md'].transitions[0].requires = [];
  });
  assert.equal(verify(root, 'G2').code, 0);
});

test('G2 fails when a label appears in two status families → P2', () => {
  const root = makeFixture(({ run }) => {
    run['p2-workflow/state-model.md'].status_families.financial.push('Payment confirmed');
  });
  const { code, json } = verify(root, 'G2');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P2');
});

test('G3 fails when account detail is not a full view → P3', () => {
  const root = makeFixture(({ run }) => {
    run['p3-design/screen-inventory.md'].account_detail_layout = 'drawer';
  });
  const { code, json } = verify(root, 'G3');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P3');
});

test('G3 fails when a key frame is not 1440px → P3', () => {
  const root = makeFixture(({ run }) => {
    run['p3-design/screen-inventory.md'].key_frames[0].width = 1280;
  });
  const { code, json } = verify(root, 'G3');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P3');
});

test('G3 fails when a payment activity is used as financial status → P3', () => {
  const root = makeFixture(({ run }) => {
    run['p3-design/component-states.md'].badges.push({ family: 'financial', label: 'Payment link sent', token: 'neutral' });
  });
  const { code, json } = verify(root, 'G3');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P3');
});

test('G3 fails when a frame is outside the destination file → P3', () => {
  const root = makeFixture(({ run }) => {
    run['p3-design/figma-output.md'].frames[0].url = 'https://www.figma.com/design/OTHERKEY/x?node-id=1-1';
  });
  const { code, json } = verify(root, 'G3');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P3');
});

test('G4 fails when a total does not reconcile with its invoices → P3', () => {
  const root = makeFixture(({ run }) => {
    run['p3-design/screen-inventory.md'].accounts_shown[0].invoice_amounts = ['£186.50', '£220.00'];
  });
  const { code, json } = verify(root, 'G4');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P3');
});

test('G4 fails on a blocklisted company name in ui_copy → P3', () => {
  const root = makeFixture(({ run }) => {
    run['p3-design/figma-output.md'].ui_copy.push({ frame: 'Loading', text: 'Powered by fakeco vets' });
  });
  const { code, json } = verify(root, 'G4');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P3');
});

test('G4 allows product names such as Payments Due and Receivables Workspace', () => {
  const root = makeFixture(({ run }) => {
    run['p3-design/figma-output.md'].ui_copy.push({ frame: 'Loading', text: 'Receivables Workspace · Payments Due · Payment Portal' });
  });
  assert.equal(verify(root, 'G4').code, 0);
});

test('G4 fails on an AI phrase and an unlisted identifier → P3', () => {
  const root = makeFixture(({ run }) => {
    run['p3-design/figma-output.md'].ui_copy.push({ frame: 'Loading', text: 'AI Recommendation for INV-99999' });
  });
  const { code, json } = verify(root, 'G4');
  assert.equal(code, 1);
  const failed = json.checks.filter((c) => !c.pass).map((c) => c.id);
  assert.ok(failed.includes('G4-9'));
  assert.ok(failed.includes('G4-13'));
  assert.equal(json.return_stage, 'P3');
});

test('G4 fails on an unapproved business rule → P2 (earliest wins)', () => {
  const root = makeFixture(({ run }) => {
    run['p3-design/design-concept.md'].business_rules_used = ['BR-01', 'BR-09'];
  });
  const { code, json } = verify(root, 'G4');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P2');
});

test('G4 treats a Critical judgement without evidence as Fail → P3', () => {
  const root = makeFixture(({ run }) => {
    run['p4-validation/qa-report.md'].critical_acceptance[3].evidence = [];
  });
  const { code, json } = verify(root, 'G4');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P3');
});

test('G4 fails when data_safety_review is Fail → P3', () => {
  const root = makeFixture(({ run }) => {
    run['p4-validation/qa-report.md'].data_safety_review.verdict = 'Fail';
  });
  const { code, json } = verify(root, 'G4');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P3');
});

test('G4 fails when a payment-confirmed account is shown as active → P3', () => {
  const root = makeFixture(({ run }) => {
    run['p3-design/screen-inventory.md'].accounts_shown.push({ client: 'Mia Chen', pets: ['Bento'], scenario: 'paid', workflow_status: 'active', total: 0, invoice_amounts: [] });
  });
  const { code, json } = verify(root, 'G4');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P3');
});

test('G4 records Standard Fail without failing the gate', () => {
  const root = makeFixture(({ run }) => {
    run['p4-validation/qa-report.md'].standard[0].verdict = 'Fail';
  });
  assert.equal(verify(root, 'G4').code, 0);
});

test('G5 fails when handoff.md is missing → P5', () => {
  const root = makeFixture(({ run }) => {
    run['p5-handoff/handoff.md'] = null;
  });
  const { code, json } = verify(root, 'G5');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P5');
});

test('G5 fails when an action has no interaction rule → P3', () => {
  const root = makeFixture(({ run }) => {
    run['p5-handoff/implementation-notes.md'].interaction_rules.pop();
  });
  const { code, json } = verify(root, 'G5');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P3');
});

test('G5 fails when a question has no owner or next step → P5', () => {
  const root = makeFixture(({ run }) => {
    run['p5-handoff/unresolved-questions.md'].questions[0].owner = '';
  });
  const { code, json } = verify(root, 'G5');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P5');
});

test('G5 fails on an unapproved business rule in handoff → P2', () => {
  const root = makeFixture(({ run }) => {
    run['p5-handoff/handoff.md'].business_rules_used = ['BR-02'];
  });
  const { code, json } = verify(root, 'G5');
  assert.equal(code, 1);
  assert.equal(json.return_stage, 'P2');
});

// ---------- halt ----------

test('G3 halts when figma_destination is null', () => {
  const root = makeFixture(({ state }) => {
    state.figma_destination = null;
  });
  const { code, json } = verify(root, 'G3');
  assert.equal(code, 2);
  assert.equal(json.result, 'halt');
});

test('G4 halts when the company blocklist file is missing', () => {
  const root = makeFixture(null, { blocklist: false });
  const { code, json } = verify(root, 'G4');
  assert.equal(code, 2);
  assert.equal(json.result, 'halt');
});

test('halts when a required output is missing', () => {
  const root = makeFixture(({ run }) => {
    run['p1-evidence/open-questions.md'] = null;
  });
  assert.equal(verify(root, 'G1').code, 2);
});

test('halts on an unknown gate', () => {
  assert.equal(verify(makeFixture(), 'G9').code, 2);
});
