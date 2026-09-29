# Receivables Design Harness

This harness turns changing B2B payment requirements and UAT feedback into a validated account-level workflow, design specification and handoff-ready output.

Primary user: one Senior Product Designer. PM, Payments team and engineers provide input and review results; they do not run the harness.

## 1. Required references (read-only for every agent)
`references/PRD.md` · `design.md` · `story-service.md` · `story-work.md` · `acceptance-criteria.md` · `sample-data.md` (exactly 6)
Rules SSOT: `harness/rules.yaml`. Specs: `harness-purpose.md`, `pipeline.md`, `artifacts.md`, `gates.md`, `roles.md`.

## 2. Trigger
- Run: "Run the receivables design harness for <slug>." / "<slug>에 대해 Receivables Design Harness를 실행해줘."
- Resume: "Resume the receivables design harness for <slug>."
- `<slug>` = `runs/<slug>/` folder. Missing folder or empty `inputs/` → Halt and request inputs.
- Implemented by `.claude/skills/receivables-harness/SKILL.md`. The main session is the Orchestrator (no orchestrator subagent).

## 3. Pipeline (strictly sequential; next stage only after its gate passes)
| Stage | Agent | Reads | Writes (`runs/<slug>/…`) | Gate |
|---|---|---|---|---|
| P1 Evidence | evidence-agent | references/, inputs/ (≥1) | p1-evidence/ evidence-summary, requirements, open-questions | G1 |
| P2 Workflow | workflow-agent | P1, references/, inputs/ | p2-workflow/ information-architecture, user-flow, state-model (+ Approved business rules BR-xx) | G2 + Human Approval |
| P3 Design | design-agent | approved P2, references/, inputs/, allowed Figma/Uibowl refs | p3-design/ design-concept, screen-inventory, component-states, figma-output + destination Figma | G3 |
| P4 Validation | qa-gatekeeper | references/, inputs/, P1–P3, state.json, Figma (read) | p4-validation/ qa-report, failed-criteria, revision-log | G4 |
| P5 Handoff | handoff-agent | P1–P4, references/, inputs/, state.json, Figma output | p5-handoff/ handoff, implementation-notes, unresolved-questions | G5 |

All 16 outputs start with YAML front matter (schema: `gates.md` §B; templates: `harness/templates/`). Plus `runs/<slug>/state.json`.

## 4. Gates
G1 → G2 → G3 → G4 → G5 via `node scripts/verify.js --run runs/<slug> --gate G<n>` (exit 0 pass · 1 fail · 2 halt). verify.js reads front matter and file existence only; it never edits files.

Key numbers: 3 key frames at 1440px + 7 states = 10 · drawer 440–520px · 4 main actions × 4 states · Critical 12 AC + 5 service conditions, Fail = 0 in each group · total − invoice sum = £0.00 · unapproved BR = 0 · Figma destination key matches state.json.

Data-safety checks: `accounts_shown` client/pets ∈ sample-data names · `ui_copy` has no email, phone, judgemental or AI phrases, or company names from `harness/company-blocklist.local.txt` (missing file → Halt) · only Northstar Care as company; Payment Portal / Payments Due / Receivables Workspace allowed · identifiers matching `[A-Z]{2,}-\d+` ∈ sample-data invoice numbers · qa-report `data_safety_review` = Pass with evidence (qa-gatekeeper judgement, not a Human Approval).

## 5. The only Human Approval Gate
After G2. The user approves information-architecture, user-flow, state-model and Approved business rules together. P3 does not start until approved. Re-passing after a return to P2 is the same gate. An approved P2 file hash change revokes approval.

## 6. Failure and return
- One return stage per failure; earliest wins: evidence → P1 · object/status/transitions/BR → P2 · screen/component/copy/value/identifier/data-safety → P3.
- G5 explicit mapping: handoff file or owner/next step missing → P5 · Figma frame link or interaction rule missing → P3 · Critical QA Fail → G4's recorded return_stage · unapproved BR → P2.
- Max 2 automated fixes per gate per run; not reset by returns or re-approval. Exceeded → Halt.
- Halt (never an approval): rules change, bad state.json, 0 inputs, fix limit, edit-scope violation, Figma destination problems, missing company blocklist, verify.js exit 2. Only an explicit human resume resets a gate's count (logged in return_history).

## 7. Agents and edit scope (max 1 folder each)
| Agent | Editable | Figma |
|---|---|---|
| Orchestrator (main session) | runs/<slug>/state.json | read; registers destination |
| evidence-agent | p1-evidence/ | read |
| workflow-agent | p2-workflow/ | read |
| design-agent | p3-design/ | write only to "Receivables Workspace - <slug>" |
| qa-gatekeeper | p4-validation/ (sole writer of revision-log) | read |
| handoff-agent | p5-handoff/ | read |

- qa-gatekeeper never edits what it judges (references/, inputs/, P1–P3, P5, state.json, any Figma).
- evidence-agent never copies real names, clinic names or contact details; it writes [client], [clinic], [redacted].
- Scope check: the Orchestrator hashes out-of-scope files before and after every agent call; any unauthorised change → Halt.
- Revision tracking: generated_files keeps old hashes until qa-gatekeeper logs changed_files (path, before/after hash, changed_by, gate_or_stage) in revision-log; then the Orchestrator updates the hashes.

## 8. State and resume (state.json, 11 keys)
slug, current_stage, last_passed_gate, failure_count, human_approval, generated_files{path,hash}, change_inputs, return_history, input_hashes, rules_hash, figma_destination.

Progress is read from state.json only. references/ or inputs/ changed → restart P1 · rules changed → Halt · P2 hash mismatch → back to approval · corrupted or missing key → Halt · figma_destination is immutable within a run.

## 9. Never
Edit references/ or inputs/ · invent evidence, AI scores or collection policies · use real customer data · merge financial status, payment activity and workflow status · treat link/reminder as payment · let archive change financial status · send a reminder for a sensitive account without note review or a visible sensitivity notice · edit any Figma except the run's destination · write real company names anywhere except `harness/company-blocklist.local.txt` · commit `runs/` or `*.local.txt` (both git-ignored).

## 10. Environment
verify.js needs Node.js ≥ 18 and js-yaml: `npm install`, then `npm test`. If Node.js is unavailable, the harness cannot pass any gate; report "Not run: Node.js unavailable" and never mark checks as Pass.
