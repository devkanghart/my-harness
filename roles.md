# Roles (R6, approved)

Purpose: [harness-purpose.md](harness-purpose.md) · Pipeline: [pipeline.md](pipeline.md) · Artifacts: [artifacts.md](artifacts.md) · Gates: [gates.md](gates.md)

## Structure

- **Orchestrator**: the Claude Code main session, driven by `.claude/skills/receivables-harness/SKILL.md`. Not a subagent (subagents cannot call other subagents). No `.claude/agents/orchestrator.md`.
- **Subagents**: exactly 5 — evidence-agent, workflow-agent, design-agent, qa-gatekeeper, handoff-agent. None merged, none added.
- Each subagent has at most 1 editable folder.

## Agent table

| Agent | Stage | Editable | Read-only | Forbidden |
|---|---|---|---|---|
| **Orchestrator** (main session skill) | Runs P1–P5, runs verify.js, returns, Halts, requests the P2 Human Approval | `runs/<slug>/state.json` | Everything | Adding evidence · fixing or ignoring gate failures · writing another agent's outputs · changing gate conditions |
| **evidence-agent** | P1 | `runs/<slug>/p1-evidence/` | `references/` (6), `runs/<slug>/inputs/` | Marking a requirement as Evidence without a source in `references/` or `inputs/` · editing P2+ files · editing references or inputs · copying real names, clinic names or contact details (use `[client]`, `[clinic]`, `[redacted]`) |
| **workflow-agent** | P2 | `runs/<slug>/p2-workflow/` | `references/`, `inputs/`, P1 outputs | BRs without source · rules without a `BR-xx` ID · editing PRD or gate conditions · editing other stages |
| **design-agent** | P3 | `runs/<slug>/p3-design/` + destination Figma file | `references/`, `inputs/`, approved P2 outputs, allowed Figma/Uibowl references | Changing PRD scope · changing status meaning · creating evidence · using unapproved BRs · editing any non-destination Figma · changing gate conditions |
| **qa-gatekeeper** | P4 | `runs/<slug>/p4-validation/` (sole writer of `revision-log.md`) | `references/` (6), `inputs/`, P1–P3 outputs, `state.json`, all Figma (read tools) | Editing P1/P2/P3/P5 · editing references, inputs, state.json · Figma write tools · changing gate conditions · passing a Fail without evidence |
| **handoff-agent** | P5 | `runs/<slug>/p5-handoff/` | `references/`, `inputs/`, gate-passed P1–P4 outputs, `state.json`, all Figma (read tools) | New product decisions · hiding QA failures · editing earlier stages · Figma write tools |

### Evidence rule

A requirement may be labelled Evidence only if its source is a real file in `references/` or `runs/<slug>/inputs/` and the source is recorded. UAT feedback, stakeholder requirements and meeting notes qualify when they exist as files in `inputs/`. Outputs never copy real names, clinic names or contact details; they are replaced with `[client]`, `[clinic]`, `[redacted]`.

### Revision notes

- The agent that fixes a failure writes `## Revision note` in the body of its own stage output.
- Before overwriting `generated_files` hashes, the Orchestrator computes `changed_files` (`path`, `before_hash`, `after_hash`, `changed_by`, `gate_or_stage`) by comparing the previous and current state.
- When calling P4, the Orchestrator passes qa-gatekeeper the G1–G3 failure records and the files changed since the last P4.
- qa-gatekeeper writes them into `revision-log.md` with the Revision note `action`.
- Only after that record is written does the Orchestrator update `generated_files` to the new hashes.
- Read scope was widened in R7; editable folders are unchanged.

## Figma permissions

| Target | design-agent | qa-gatekeeper | handoff-agent | Orchestrator |
|---|---|---|---|---|
| Destination `Receivables Workspace - <slug>` | create + edit | read | read | read; registers URL and key in `state.json` |
| Reference Figma in `inputs/` | read | read | read | — |
| Company Payment Portal original, company design system original | never edit | never edit | never edit | never edit |

- Figma **write** tools (e.g. `use_figma`, `create_new_file`, `upload_assets`): design-agent only, destination file only.
- Figma **read** tools (e.g. `get_design_context`, `get_screenshot`, `get_metadata`, `get_variable_defs`): all 5 subagents.

### Destination rules

- A new run creates a new file `Receivables Workspace - <slug>`. Retries and resumes in the same run reuse it.
- design-agent records `file_key` and `file_url` in `figma-output.md`; the Orchestrator registers `state.figma_destination` (`source: created`).
- If the file cannot be created: do not touch any existing file; **Halt** and ask the user for an empty Figma file URL; register it (`source: user_provided`).
- Once registered, it cannot change within the run. A change request → **Halt** and user confirmation.

## Edit-scope enforcement

Run by the Orchestrator around every subagent call:

1. Before: record hashes of all files outside the agent's editable scope (`references/**`, `inputs/**`, `state.json`, other stage folders).
2. After: recompute them.
3. Any unauthorised change → **Halt**; log path, agent, `hash_before`, `hash_after` in `return_history`.
4. The Orchestrator's own `state.json` updates are exempt.
5. Only files changed inside the agent's scope are written to `generated_files` with new hashes.

## Natural-language triggers

| Use | Phrase |
|---|---|
| Run (EN) | "Run the receivables design harness for <slug>." |
| Run (KO) | "<slug>에 대해 Receivables Design Harness를 실행해줘." |
| Resume | "Resume the receivables design harness for <slug>." |

`<slug>` must equal the `runs/<slug>/` folder name exactly. Missing folder or empty `inputs/` → **Halt** and request inputs.

---

# File specifications

Not created yet. Created after R8 final approval.

## `.claude/skills/receivables-harness/SKILL.md`

**Front matter**

```yaml
name: receivables-harness
description: Run or resume the Receivables Design Harness for a run slug. Use when the user says "Run the receivables design harness for <slug>", "<slug>에 대해 Receivables Design Harness를 실행해줘" or "Resume the receivables design harness for <slug>".
```

**Procedure**

1. Parse `<slug>` and mode (run / resume).
2. Preflight: `runs/<slug>/` exists and `inputs/` has ≥ 1 file; 6 reference documents exist; `harness/rules.yaml` exists. Otherwise **Halt**.
3. Run: create `state.json` from the template (11 keys; `figma_destination: null`), record `input_hashes`, `rules_hash`, `change_inputs`. Resume: validate `state.json` and apply the resume rules in `artifacts.md`.
4. For each stage from `current_stage`:
   1. Scope check "before" hashes.
   2. Call the stage subagent with the slug, its inputs and the relevant rules.
   3. Scope check "after" hashes → Halt on violation.
   4. Compute `changed_files` against `generated_files` (do not overwrite yet); for P3 register `figma_destination` if newly created. Before P4, pass pending `changed_files` and G1–G3 failure records to qa-gatekeeper; update `generated_files` hashes only after `revision-log.md` records them (no extra storage: until then `generated_files` keeps the old hash, so `changed_files` = files whose on-disk hash differs from `generated_files`; `changed_by` and `gate_or_stage` come from the folder's owning agent and stage).
   5. `node scripts/verify.js --run runs/<slug> --gate G<n>`.
   6. Exit 0 → set `last_passed_gate`, advance. Exit 1 → increment `failure_count[G<n>]`, append `return_history`, go to `return_stage`; if count > 2 → **Halt**. Exit 2 → **Halt**.
5. After G2 passes: show IA, user flow, state model and Approved business rules; wait for the user's approval (the only Human Approval Gate). Record `approved_at` and `approved_file_hashes`. Do not start P3 until approved.
6. On Halt: show the cause, attempted fixes and the decision needed; wait. Reset a gate's `failure_count` only on an explicit human resume, logged in `return_history`.
7. After G5 passes: set `current_stage: done` and report outputs.

## `.claude/agents/*.md`

Common front matter fields: `name`, `description`, `tools`. Every agent file body states: stage, editable folder, read-only scope, forbidden edits, required YAML front matter keys for its outputs (from `gates.md`), the `## Revision note` rule, and "report back to the Orchestrator; never call verify.js or edit state.json".

| File | name | tools | Body must include |
|---|---|---|---|
| `evidence-agent.md` | evidence-agent | Read, Glob, Grep, Write, Edit | E/H/C/U labelling, ID and source rules, `figma_reference_keys` extraction, redaction tokens |
| `workflow-agent.md` | workflow-agent | Read, Glob, Grep, Write, Edit | Status allowlists, `transitions` schema, `BR-xx` rules, Search/Filter/Sort sections |
| `design-agent.md` | design-agent | Read, Glob, Grep, Write, Edit, Figma read tools, Figma write tools | 3 key frames + 7 states, widths, 4 account scenarios, destination rules, `ui_copy` capture, `business_rules_used` |
| `qa-gatekeeper.md` | qa-gatekeeper | Read, Glob, Grep, Write, Edit, Figma read tools | 12 + 5 Critical judgements with evidence format, 28 Standard, 4 NHR, required `data_safety_review` (unlisted real names; not a Human Approval), return-stage order, revision-log ownership |
| `handoff-agent.md` | handoff-agent | Read, Glob, Grep, Write, Edit, Figma read tools | Screen links, 4 interaction rules, unresolved-question owner/next step, no new decisions, `business_rules_used` |

No subagent gets Bash. Only the Orchestrator runs `verify.js` and hash checks.
