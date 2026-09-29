# Gates (R5, approved)

Purpose: [harness-purpose.md](harness-purpose.md). Pipeline: [pipeline.md](pipeline.md). Artifacts: [artifacts.md](artifacts.md).

## Gate table

| Gate | Machine checks | Human approval | Return on failure |
|---|---|---|---|
| **G1 Evidence** | ① reference documents read = 6 ② `inputs/` files ≥ 1 ③ duplicate requirement IDs = 0 ④ each requirement has exactly 1 label (E/H/C/U) ⑤ each Evidence has `sources` ≥ 1 ⑥ Conflict/Unknown IDs missing from open-questions = 0 | none | P1 |
| **G2 Workflow** | ① Account definition ≥ 1 ② Invoice definition ≥ 1 ③ Invoices without `account_id` = 0 ④ 3 separate status family lists ⑤ labels duplicated across families = 0 ⑥ exactly 1 section each for Search, Filter, Sort ⑦ scenarios missing start or end = 0 ⑧ `BR-xx` ≥ 1 ⑨ BRs without source = 0 ⑩ `transitions` checks (section C, P2 layer) | **Human Approval Gate (the only one)** | P2 |
| **G3 Design** | ① key frames = 3 ② states = 7 ③ named states = 10, present in both `screen-inventory` and `figma-output` ④ all 4 account scenarios present ⑤ key frame width = 1440 ⑥ `account_detail_layout` = full_view (D-15; was drawer width 440–520) ⑦ Figma URL ≥ 1 ⑧ frame names ≥ 1 ⑨ each of 4 main actions has Default/Loading/Success/Error = 4 ⑩ forbidden status mappings = 0 ⑪ status badges without label = 0 ⑫ `business_rules_used` present ⑬ Figma destination check (below) | none | P3 (`figma_destination` null → Halt) |
| **G4 Service and QA** | ① Critical AC (12) judgement structure ② Critical AC Fail = 0 ③ Critical service conditions (5) judgement structure ④ Critical service condition Fail = 0 ⑤ Account total − Invoice sum = £0.00 ⑥ forbidden status mappings = 0 ⑦ `accounts_shown` client/pets not in name allowlist = 0 ⑧ in `ui_copy`: emails, phone numbers, blocklisted company names = 0; non-allowlisted URLs in front matter = 0 ⑨ AI forbidden phrases in `ui_copy` = 0 ⑩ BRs not in approved list = 0 ⑪ Standard (28) judgements present; Fails recorded only ⑫ Needs Human Review (4) list present ⑬ identifiers `[A-Z]{2,}-\d+` in `ui_copy` not in sample-data identifier allowlist = 0 ⑭ `data_safety_review.verdict` = Pass with non-empty evidence | none | By type (section D) |
| **G5 Handoff** | ① 3 files exist ② required screens (of 10) without Figma link = 0 ③ main actions (of 4) without interaction rule = 0 ④ unresolved questions without owner or next step = 0 ⑤ Critical Fail = 0 ⑥ BRs not in approved list = 0 | none | Explicit mapping (section D, G5) |

### G3 ⑬ Figma destination check (R6)

- If `state.figma_destination` is null → do not run G3; **Halt** (exit 2).
- `figma-output.file_key` = `state.figma_destination.file_key`.
- Every `figma-output.frames[].url` points to the destination file key.
- Destination file key ∉ `evidence-summary.figma_reference_keys`.
- Failure → P3.

## Common rules

- Automated fix: max **2** per gate per run. Exceeded → **Halt**.
- Returning to an earlier stage or re-approving P2 does not reset a gate's count. Only an explicit human resume after a Halt resets that gate's `failure_count` to 0; the reset and reason are recorded in `return_history`.
- Checks the script cannot confirm are recorded as Needs Human Review, never auto-Pass.
- QA Gatekeeper judgements are not Human Approval. The only Human Approval Gate is after P2.

## Critical judgements in G4 (17 = 12 + 5)

Counted separately in `qa-report.md`. Both must have Fail = 0 to pass G4.

### Critical acceptance criteria (exactly 12)

Listed in [harness-purpose.md](harness-purpose.md). Items 1–11 are judged by the QA Gatekeeper with evidence. Item 12 is checked by script: every ID in `business_rules_used` exists in P2 `approved_business_rules`.

### Critical service conditions (exactly 5)

| ID | Condition (count must be 0) | Source |
|---|---|---|
| a | `bad payer`, `problem client`, `high risk` found | design.md §8, sample-data (Theo) |
| b | Archived state uses a green or success semantic token | design.md §2 |
| c | Sensitive account `send_reminder` has neither `requires: [note_reviewed]` nor `shows: [sensitivity_notice]` | PRD 6.7-2, sample-data (Theo) |
| d | Unconfirmed account disappears from active queue after link creation or reminder | PRD 6.1 |
| e | Payment-confirmed account remains in active Payments Due queue | PRD 6.1, sample-data (Mia Chen) |

Default return: P3. If the cause is P2's state model or Approved business rules, return to P2 (section C).

## Main actions and status lists

- Main actions (exactly 4): Create payment link, Send reminder, Archive from queue, Restore.
- Status allowlists (PRD 7.1–7.3):
  - financial (4): Due, Overdue, Paid, Cancelled
  - payment_activity (6): No payment link, Payment link created, Payment link sent, Payment link expired, Reminder sent, Payment confirmed
  - workflow (2): Active in Payments Due, Archived from queue
- Forbidden status mappings (exactly 3). Any one found → G3 or G4 Fail:
  1. A payment activity value used as financial status
  2. `Archived from queue` used as financial status
  3. `Paid` or payment-success meaning used for any state other than `Payment confirmed`

---

# scripts/verify.js specification

Not created yet. Created after R8 final approval.

## A. Invocation

```bash
node scripts/verify.js --run runs/<slug> --gate G1|G2|G3|G4|G5
```

- **Read-only.** Modifies no files, including `state.json`. The Orchestrator records results.
- Output to stdout as JSON:
  `{ "gate": "G1", "result": "pass|fail|halt", "checks": [{ "id": "G1-1", "pass": true, "detail": "string", "return_stage": "P1|P2|P3|null" }], "return_stage": "P1|P2|P3|null" }`
- Exit codes: `0` pass · `1` fail (exactly one `return_stage`) · `2` halt (required file or structure missing, parse failure, `figma_destination` null at G3, `harness/company-blocklist.local.txt` missing).
- Also reads `runs/<slug>/state.json` (read-only) for `figma_destination`.
- All thresholds and lists are read from `harness/rules.yaml`. No numbers hardcoded in the script.
- Reads YAML front matter and file existence only. Never interprets Markdown body meaning.

## B. YAML front matter schema

All 16 stage outputs start with YAML front matter. Human-readable explanation and rationale go in the Markdown body.

| File | Required front matter keys |
|---|---|
| `p1-evidence/evidence-summary.md` | `sources_read: []`, `figma_reference_keys: []` (file keys of reference Figma in `inputs/`; empty list if none) |
| `p1-evidence/requirements.md` | `requirements: [{id, label: E\|H\|C\|U, sources: []}]` |
| `p1-evidence/open-questions.md` | `questions: [{id, requirement_id}]` |
| `p2-workflow/information-architecture.md` | `sections: [search, filter, sort, ...]` |
| `p2-workflow/user-flow.md` | `scenarios: [{id, start_state, end_state}]` |
| `p2-workflow/state-model.md` | `objects: {account: {fields}, invoice: {fields}}`, `status_families: {financial: [], payment_activity: [], workflow: []}`, `transitions: [{action, applies_to, requires: [], shows: [], sets: {}, unchanged: []}]`, `approved_business_rules: [{id, rule, source}]` |
| `p3-design/design-concept.md` | `business_rules_used: []` |
| `p3-design/screen-inventory.md` | `key_frames: [{name, width}]`, `states: [{name, type, parent_frame}]`, `account_detail_layout` (full_view), `accounts_shown: [{client, pets: [], scenario, workflow_status, total, invoice_amounts: []}]`, `business_rules_used: []` |
| `p3-design/component-states.md` | `actions: [{name, states: []}]`, `badges: [{family, label, token}]` |
| `p3-design/figma-output.md` | `file_key`, `file_url`, `frames: [{name, node_id, url}]`, `ui_copy: [{frame, text}]` |
| `p4-validation/qa-report.md` | `critical_acceptance: [{id, verdict: Pass\|Fail, evidence: []}]`, `critical_service_conditions: [{id: a-e, verdict, evidence: []}]`, `standard: [{id, verdict, evidence: []}]`, `needs_human_review: [{id, question}]`, `data_safety_review: {verdict: Pass\|Fail, evidence: []}` (required) |
| `p4-validation/failed-criteria.md` | `failures: [{id, group, return_stage}]` |
| `p4-validation/revision-log.md` | `entries: [{attempt, failed_gate, failure_reason, return_stage, changed_files: [{path, before_hash, after_hash, changed_by, gate_or_stage}], action}]` |
| `p5-handoff/handoff.md` | `screens: [{name, figma_url}]`, `business_rules_used: []` |
| `p5-handoff/implementation-notes.md` | `interaction_rules: [{action}]`, `business_rules_used: []` |
| `p5-handoff/unresolved-questions.md` | `questions: [{id, owner, next_step}]` (owner or next_step non-empty) |

### Evidence reference format

- `figma:<node_id>`: `node_id` must exist in `figma-output.frames`.
- `<file path>#<section-id>`: file must exist and contain that section ID.
- A Critical judgement with empty or unresolvable evidence → treated as Fail, return to P3.

### Critical judgement structure checks (G4)

1. `critical_acceptance` has exactly 12 entries; `critical_service_conditions` has exactly 5.
2. Each `verdict` ∈ {Pass, Fail}.
3. Each `evidence` is non-empty.
4. Every referenced file / node exists.
5. Fail count = 0 in each group, counted separately.

## C. Service condition checks (two layers)

| Condition | P2 layer: `state-model.transitions` → fail returns **P2** | P3 layer: screens → fail returns **P3** |
|---|---|---|
| a | — | Forbidden judgemental phrases in `figma-output.ui_copy` = 0 |
| b | — | `component-states.badges` where label is archived and token is green/success = 0 |
| c | For sensitive accounts, `send_reminder` has `requires` ∋ `note_reviewed` **or** `shows` ∋ `sensitivity_notice` (≥ 1 of 2). Fail only if both absent | QA verdict Pass with evidence |
| d | After `link_created`, `link_sent`, `reminder_sent`: `workflow_status` stays `active` | QA verdict Pass with evidence |
| e | After `payment_confirmed`: account leaves active queue | `accounts_shown` with Mia Chen and `workflow_status: active` = 0 |
| Archive (common) | `archive`, `restore`: `financial_status` and amounts in `unchanged` | — |

## D. G4 return decision

When several checks fail, return to the **earliest** single stage:

1. Missing source or evidence → P1
2. Object, status, `transitions`, BR definition error, or unapproved BR → P2
3. Screen, component, copy, value transfer error, Critical judgement without evidence, unlisted identifier, or `data_safety_review` Fail → P3

## D-2. G5 return mapping (explicit; no natural-language judgement)

| G5 failure | Return to |
|---|---|
| `handoff.md`, `implementation-notes.md` or `unresolved-questions.md` missing | P5 |
| Unresolved question without owner or next step | P5 |
| Required screen without Figma frame link | P3 |
| Main action without interaction rule | P3 |
| Critical QA Fail | the `return_stage` recorded by G4 in `failed-criteria.md` (earliest) |
| Business rule not in approved list | P2 |

## E. Allowlists and blocklists (moved into rules.yaml)

| List | Values | Match rule | Scope |
|---|---|---|---|
| Status allowlists | See "Main actions and status lists" | exact | `state-model.status_families`, `component-states.badges` |
| Forbidden status mappings | 3 (above) | — | `component-states.badges`, `state-model` |
| Judgemental phrases | `bad payer`, `problem client`, `high risk` | case-insensitive exact phrase | `figma-output.ui_copy` only |
| AI forbidden phrases | `AI score`, `risk score`, `priority score`, `AI recommendation` | case-insensitive exact phrase | `figma-output.ui_copy` only |
| Name allowlist | 7 clients and their pets in `sample-data.md` | exact | `screen-inventory.accounts_shown[].client`, `accounts_shown[].pets` only |
| Company allowlist | `Northstar Care` | exact | — |
| Company blocklist | read from `harness/company-blocklist.local.txt` (one name per line, git-ignored; rules.yaml stores only the path). Missing file → **Halt** | case-insensitive exact phrase | `figma-output.ui_copy` only |
| Allowed product/project names | `Payment Portal`, `Payments Due`, `Receivables Workspace` (never blocked) | — | — |
| Identifier allowlist | invoice numbers in `sample-data.md`: INV-10428, INV-10802, INV-11176, INV-09771, INV-10108, INV-10556, INV-10993 | exact | `figma-output.ui_copy` tokens matching `[A-Z]{2,}-\d+` |
| Unlisted real names (people, clinics, customers) | judged by qa-gatekeeper in `data_safety_review` (not a Human Approval) | — | P3 outputs and Figma |
| PII patterns | email, phone number | regex | `figma-output.ui_copy` |
| URL allowlist | `figma.com` | host match | all front matter |

Documents that explain rules may mention forbidden phrases; they are not scanned for phrases outside `ui_copy`.
