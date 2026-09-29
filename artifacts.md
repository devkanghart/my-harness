# Artifacts (R4, approved)

Purpose: [harness-purpose.md](harness-purpose.md). Pipeline: [pipeline.md](pipeline.md).

## Folder structure

```txt
<project root>/
├── CLAUDE.md                      # created after R8 final approval
├── references/                    # 6 reference documents, read-only for every agent
│   ├── PRD.md
│   ├── design.md
│   ├── story-service.md
│   ├── story-work.md              # renamed from work-process.md
│   ├── acceptance-criteria.md
│   └── sample-data.md
├── harness/
│   ├── rules.yaml                 # SSOT, created after R8
│   └── company-blocklist.local.txt  # real company names, one per line, git-ignored
└── runs/<slug>/
    ├── inputs/                    # change inputs, ≥1, read-only once the run starts
    ├── p1-evidence/
    │   ├── evidence-summary.md
    │   ├── requirements.md
    │   └── open-questions.md
    ├── p2-workflow/
    │   ├── information-architecture.md
    │   ├── user-flow.md
    │   └── state-model.md
    ├── p3-design/
    │   ├── design-concept.md
    │   ├── screen-inventory.md
    │   ├── component-states.md
    │   └── figma-output.md
    ├── p4-validation/
    │   ├── qa-report.md
    │   ├── failed-criteria.md
    │   └── revision-log.md
    ├── p5-handoff/
    │   ├── handoff.md
    │   ├── implementation-notes.md
    │   └── unresolved-questions.md
    └── state.json
```

Interview documents (`harness-purpose.md`, `pipeline.md`, `artifacts.md`, `gates.md`, `roles.md`) stay at the project root until R7.

## Git exclusions

`.gitignore` includes `runs/`, `*.local.txt` and `node_modules/`, so run outputs (which may derive from real UAT inputs) and the real company blocklist never enter the repository.

## File counts

| Group | Count | Rule |
|---|---|---|
| Reference documents (`references/`) | exactly 6 | Read-only for every agent. PRD text unchanged; its `references/` paths now match |
| Change inputs (`runs/<slug>/inputs/`) | ≥ 1 | Placed by the Senior Product Designer before the run. 0 files → Halt |
| Stage outputs | exactly 16 | P1 3, P2 3, P3 4, P4 3, P5 3. None merged or removed |
| `state.json` | exactly 1 | Edited only by the Orchestrator |
| SSOT (`harness/rules.yaml`) | exactly 1 | |

## Retries and history

- A retry overwrites that stage's outputs. No snapshot files.
- `revision-log.md` accumulates one entry per attempt with: `attempt`, `failed_gate`, `failure_reason`, `return_stage`, `changed_files` (`path`, `before_hash`, `after_hash`, `changed_by`, `gate_or_stage`), `action`.
- The Orchestrator computes `changed_files` before overwriting `generated_files` hashes, passes them (with G1–G3 failure records) to qa-gatekeeper at P4, and updates hashes only after `revision-log.md` records them.
- Earlier file contents are recovered from git history.

## state.json schema (exactly 11 required keys)

```json
{
  "slug": "string",
  "current_stage": "P1 | P2 | P3 | P4 | P5 | done",
  "last_passed_gate": "null | G1 | G2 | G3 | G4 | G5",
  "failure_count": { "G1": 0, "G2": 0, "G3": 0, "G4": 0, "G5": 0 },
  "human_approval": {
    "status": "pending | approved",
    "approved_at": "ISO8601 | null",
    "approved_file_hashes": { "<p2 file path>": "sha256" }
  },
  "generated_files": [{ "path": "string", "hash": "sha256" }],
  "change_inputs": ["runs/<slug>/inputs/<file>"],
  "return_history": [{ "from_gate": "G1-G5 | resume | scope_check", "to_stage": "P1-P5 | halt", "reason": "string", "changed_files": ["path"], "agent": "string | null", "hash_before": "sha256 | null", "hash_after": "sha256 | null" }],
  "input_hashes": { "<references/* or runs/<slug>/inputs/* path>": "sha256" },
  "rules_hash": "sha256",
  "figma_destination": null | {
    "file_key": "string",
    "file_url": "string",
    "created_at": "ISO8601",
    "source": "created | user_provided"
  }
}
```

## Resume rules

Progress is judged from `state.json` only, never from conversation history.

| Condition | Action |
|---|---|
| `state.json` corrupted or any of the 11 required keys missing | **Halt**. Do not guess |
| All hashes match | Resume at the stage after `last_passed_gate` |
| A `references/*` hash differs | Restart from P1 |
| A `runs/<slug>/inputs/*` file or hash differs | Restart from P1; record the change and changed files in `return_history` |
| A P2 file hash differs from `human_approval.approved_file_hashes` | Revoke approval; stop at the P2 Human Approval Gate |
| `rules_hash` differs | **Halt**. Show the rule change and ask the user where to restart |
| `figma_destination` is null when P3 needs it | Design Agent creates the file; if it cannot, **Halt** and ask for an empty Figma file URL |

## Human Approval vs Halt

| Type | Count | When |
|---|---|---|
| Human Approval Gate | exactly 1 | After P2, normal pipeline path. May be re-passed in one run after a return to P2 |
| Halt | not a gate | Error or exception only: rules change, corrupted `state.json`, 0 change inputs, 2 failed auto-fixes at one gate, edit-scope violation, Figma destination cannot be created or must change, and similar |

Halts are not counted as Human Approval Gates.

## rules.yaml draft

Not created yet. Gate conditions and lists: [gates.md](gates.md). Agents and permissions: [roles.md](roles.md).

```yaml
version: 1

paths:
  references_dir: references/
  run_dir: runs/<slug>/
  inputs_dir: runs/<slug>/inputs/
  state_file: runs/<slug>/state.json

reference_documents:          # exactly 6, read-only
  - references/PRD.md
  - references/design.md
  - references/story-service.md
  - references/story-work.md
  - references/acceptance-criteria.md
  - references/sample-data.md

change_inputs:
  min_files: 1
  groups:
    A: [uat_feedback, stakeholder_requirement]
    B: [ux_problem, screen_or_interaction_to_revise]
    C: [technical_constraint, unresolved_question, figma_reference]
  optional_references: [uibowl_reference, figma_reference]

stages:                       # strictly sequential, no parallelism between stages
  - id: P1
    name: Evidence and Requirements
    required_inputs: [reference_documents, change_inputs]
    required_outputs:
      - p1-evidence/evidence-summary.md
      - p1-evidence/requirements.md
      - p1-evidence/open-questions.md
    gate: G1
  - id: P2
    name: Workflow and State Model
    required_inputs:
      - p1-evidence/*              # gate-passed
      - references/**
      - runs/<slug>/inputs/**
    required_outputs:
      - p2-workflow/information-architecture.md
      - p2-workflow/user-flow.md
      - p2-workflow/state-model.md   # must contain "Approved business rules"
    gate: G2
    human_approval: true
  - id: P3
    name: Design Concept
    required_inputs:
      - p2-workflow/*               # approved
      - references/**
      - runs/<slug>/inputs/**
    optional_inputs: [allowed_uibowl_reference, figma_reference]
    required_outputs:
      - p3-design/design-concept.md
      - p3-design/screen-inventory.md
      - p3-design/component-states.md
      - p3-design/figma-output.md
    gate: G3
  - id: P4
    name: Validation
    required_inputs:
      - p3-design/*
      - references/PRD.md
      - references/design.md
      - references/acceptance-criteria.md
      - references/sample-data.md
      - p2-workflow/state-model.md  # Approved business rules
    required_outputs:
      - p4-validation/qa-report.md
      - p4-validation/failed-criteria.md
      - p4-validation/revision-log.md
    gate: G4
    internal_parallel: [automated_checks, human_review_list]
  - id: P5
    name: Handoff
    required_inputs:
      - p1-evidence/*
      - p2-workflow/*
      - p3-design/*                 # incl. figma-output.md
      - p4-validation/*
      - references/**
      - runs/<slug>/inputs/**
      - runs/<slug>/state.json
    required_outputs:
      - p5-handoff/handoff.md
      - p5-handoff/implementation-notes.md
      - p5-handoff/unresolved-questions.md
    gate: G5

human_approval_gate:
  count: 1
  after_stage: P2
  approves:
    - p2-workflow/information-architecture.md
    - p2-workflow/user-flow.md
    - p2-workflow/state-model.md
  re_pass_allowed: true
  block_next_stage_until_approved: true

business_rules:
  id_pattern: "^BR-\\d{2}$"
  approved_list: p2-workflow/state-model.md#approved-business-rules   # columns: id, rule, source
  used_list_key: business_rules_used    # required in P3 and P5 outputs
  max_unapproved: 0
  natural_language_rule_without_id: forbidden
  on_unapproved: return_to_P2

gates: see gates.md          # G1–G5 conditions and verify.js spec (R5 approved)

lists:                        # same values as gates.md section E
  status_families:
    financial: [Due, Overdue, Paid, Cancelled]
    payment_activity: [No payment link, Payment link created, Payment link sent, Payment link expired, Reminder sent, Payment confirmed]
    workflow: [Active in Payments Due, Archived from queue]
  main_actions: [Create payment link, Send reminder, Archive from queue, Restore]
  judgemental_phrases: {values: [bad payer, problem client, high risk], match: ci_exact_phrase, scope: figma-output.ui_copy}
  ai_phrases: {values: [AI score, risk score, priority score, AI recommendation], match: ci_exact_phrase, scope: figma-output.ui_copy}
  name_allowlist: {source: references/sample-data.md, scope: [screen-inventory.accounts_shown.client, screen-inventory.accounts_shown.pets]}
  company_allowlist: [Northstar Care]
  company_blocklist: {file: harness/company-blocklist.local.txt, match: ci_exact_phrase, scope: figma-output.ui_copy, on_missing: halt}   # names never written here
  allowed_product_names: [Payment Portal, Payments Due, Receivables Workspace]
  identifier_pattern: "[A-Z]{2,}-\\d+"
  identifier_allowlist: [INV-10428, INV-10802, INV-11176, INV-09771, INV-10108, INV-10556, INV-10993]   # from sample-data.md
  data_safety_review: {file: p4-validation/qa-report.md, key: data_safety_review, pass_if: verdict == Pass and evidence non-empty, on_fail: P3}
  redaction_tokens: ["[client]", "[clinic]", "[redacted]"]   # evidence-agent
  pii_patterns: {values: [email, phone], scope: figma-output.ui_copy}
  url_allowlist: [figma.com]
  sensitivity_reminder_rule: {transition: send_reminder, applies_to: sensitive, pass_if_any: [requires.note_reviewed, shows.sensitivity_notice]}

return_rules:                 # exactly one return stage per failure
  missing_evidence_or_source: P1
  object_status_workflow_definition_error: P2
  unapproved_business_rule: P2
  value_transfer_error: P3    # totals, currency format, sample-data values
  screen_component_interaction_below_criteria: P3
  unlisted_identifier_or_data_safety_fail: P3
  g5:                         # explicit mapping, no natural-language judgement
    handoff_file_missing: P5
    unresolved_question_without_owner_or_next_step: P5
    screen_without_figma_link: P3
    action_without_interaction_rule: P3
    critical_qa_fail: g4_recorded_return_stage
    unapproved_business_rule: P2

retries:
  max_auto_fix_per_gate: 2
  reset: only_on_explicit_human_resume_after_halt   # logged in return_history
  on_exceeded: halt

halt_conditions:              # not Human Approval Gates
  - rules_hash_changed
  - state_json_corrupted_or_missing_key
  - change_inputs_zero
  - auto_fix_limit_exceeded
  - edit_scope_violation        # file outside agent's scope changed (hash before/after)
  - figma_destination_cannot_be_created
  - figma_destination_change_requested
  - figma_destination_null_at_G3
  - run_folder_missing_or_inputs_empty_at_trigger
  - company_blocklist_file_missing

resume:
  source_of_truth: state.json
  required_state_keys:
    [slug, current_stage, last_passed_gate, failure_count, human_approval,
     generated_files, change_inputs, return_history, input_hashes, rules_hash,
     figma_destination]
  on_reference_hash_change: restart_P1
  on_inputs_hash_change: restart_P1_and_log_return_history
  on_p2_hash_mismatch: revoke_approval_and_wait_at_P2_gate
  on_rules_hash_change: halt_and_ask_restart_point

scope_check:                  # run by the Orchestrator around every subagent call
  before_agent: record hashes of all files outside the agent's editable scope
  after_agent: recompute the same hashes
  watched: [references/**, runs/<slug>/inputs/**, runs/<slug>/state.json, other stage folders]
  exception: Orchestrator's own state.json updates
  on_violation: halt_and_log_return_history   # path, agent, hash_before, hash_after
  generated_files_update: only files changed inside the agent's scope, after changed_files are logged

figma_destination:
  file_name: "Receivables Workspace - <slug>"
  created_by: design-agent
  registered_by: orchestrator
  null_allowed_until_registered: true
  immutable_within_run: true
  on_change_request: halt
  on_create_failure: halt_and_ask_empty_file_url   # source: user_provided
  never_edit: [company payment portal original, company design system original, inputs/ Figma references]

retention:
  overwrite_on_retry: true
  snapshots: false
  revision_log_fields: [attempt, failed_gate, failure_reason, return_stage, changed_files, action]
  changed_files_fields: [path, before_hash, after_hash, changed_by, gate_or_stage]
  generated_files_update: after_revision_log_records_changes

agents:                      # details: roles.md
  orchestrator: { runs_as: main_session_skill, skill: .claude/skills/receivables-harness/SKILL.md, editable: runs/<slug>/state.json }
  evidence-agent: { stage: P1, editable: runs/<slug>/p1-evidence/ }
  workflow-agent: { stage: P2, editable: runs/<slug>/p2-workflow/ }
  design-agent: { stage: P3, editable: runs/<slug>/p3-design/, figma_write: destination_only }
  qa-gatekeeper: { stage: P4, editable: runs/<slug>/p4-validation/, figma_write: false }
  handoff-agent: { stage: P5, editable: runs/<slug>/p5-handoff/, figma_write: false }

forbidden_edits:
  - references/**             # all agents
  - harness/rules.yaml        # all agents during a run
  - runs/<slug>/inputs/**     # after the run starts
```
