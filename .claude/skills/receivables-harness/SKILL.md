---
name: receivables-harness
description: Run or resume the Receivables Design Harness for a run slug. Use when the user says "Run the receivables design harness for <slug>", "<slug>에 대해 Receivables Design Harness를 실행해줘" or "Resume the receivables design harness for <slug>".
---

# Receivables Design Harness — Orchestrator

You (the main session) are the Orchestrator. You run P1–P5 in order, call the 5 subagents, run `scripts/verify.js`, manage `runs/<slug>/state.json`, and handle returns and Halts. Rules SSOT: `harness/rules.yaml`. Specs: `CLAUDE.md`, `pipeline.md`, `artifacts.md`, `gates.md`, `roles.md`.

**You edit only `runs/<slug>/state.json`.** You never add evidence, write another agent's outputs, fix or ignore a gate failure yourself, or change gate conditions.

## 1. Parse the trigger

- `Run … for <slug>` / `<slug>에 대해 … 실행해줘` → mode `run`.
- `Resume … for <slug>` → mode `resume`.
- `<slug>` must equal a folder name under `runs/` exactly.

## 2. Preflight (any failure → Halt)

1. `runs/<slug>/` exists and `runs/<slug>/inputs/` has ≥ 1 non-hidden file. Otherwise Halt and ask for the change inputs (group A, B or C).
2. All 6 files in `references/` exist.
3. `harness/rules.yaml` and `harness/company-blocklist.local.txt` exist.
4. Node.js is available (`node --version`) and `node_modules/js-yaml` exists. Otherwise Halt: "Not run: Node.js unavailable" — never treat a gate as passed without verify.js.

## 3. Initialise or validate state.json

- **run:** copy `harness/templates/state.json`, set `slug`, `change_inputs` (all files in `inputs/`), `input_hashes` (sha256 of every `references/*` and `inputs/*` file), `rules_hash` (sha256 of `harness/rules.yaml`), `figma_destination: null`.
- **resume:** `state.json` must parse and have all 11 keys (`slug, current_stage, last_passed_gate, failure_count, human_approval, generated_files, change_inputs, return_history, input_hashes, rules_hash, figma_destination`). Missing or corrupt → Halt; never guess. Then:
  - `rules_hash` differs → Halt; show the change; ask where to restart.
  - any `references/*` hash differs → restart at P1.
  - any `inputs/*` file or hash differs → restart at P1; append to `return_history` with the changed files.
  - a P2 file hash differs from `human_approval.approved_file_hashes` → revoke approval (`status: pending`) and stop at the Human Approval Gate.
  - otherwise continue at the stage after `last_passed_gate`.
- Progress comes from `state.json` only, never from conversation memory.

## 4. Stage loop (P1 → P5, strictly sequential)

| Stage | Subagent | Gate |
|---|---|---|
| P1 | evidence-agent | G1 |
| P2 | workflow-agent | G2 → Human Approval |
| P3 | design-agent | G3 |
| P4 | qa-gatekeeper | G4 |
| P5 | handoff-agent | G5 |

For each stage from `current_stage`:

1. **Scope check — before:** record sha256 of every file outside the agent's editable folder: `references/**`, `runs/<slug>/inputs/**`, `runs/<slug>/state.json`, and all other stage folders.
2. **Call the subagent** with: the slug, its editable folder, the templates path, and for re-runs the failing checks from verify.js. Extra per stage:
   - P3: pass the current `figma_destination` (null or the registered file).
   - P4: pass the pending `changed_files` (see step 4) and the G1–G3 failure records since the last P4, for `revision-log.md`.
3. **Scope check — after:** recompute the same hashes. Any change → Halt; append `{from_gate: scope_check, to_stage: halt, agent, changed_files, hash_before, hash_after}` to `return_history`.
4. **changed_files:** compare each file in the agent's folder with `generated_files`. Files whose disk hash differs are `changed_files` (`path, before_hash, after_hash, changed_by, gate_or_stage`). Do not overwrite `generated_files` yet — update those hashes only after qa-gatekeeper has written them to `revision-log.md` (after P4). New files with no previous hash are recorded with `before_hash: null`.
5. **P3 only — Figma destination:** if `figma_destination` is null and design-agent created the file, register `{file_key, file_url, created_at, source: created}`. If design-agent could not create it → Halt; ask the user for an empty Figma file URL; register it with `source: user_provided`. Once registered it never changes within the run; a change request → Halt.
6. **Run the gate:** `node scripts/verify.js --run runs/<slug> --gate G<n>`.
   - exit `0` → set `last_passed_gate: G<n>`, advance `current_stage`.
   - exit `1` → increment `failure_count.G<n>`; append `{from_gate: G<n>, to_stage: <return_stage>, reason}` to `return_history`; set `current_stage` to the returned stage. If `failure_count.G<n>` > 2 → Halt.
   - exit `2` → Halt with the `detail` from verify.js.

## 5. The only Human Approval Gate (after G2 passes)

1. Show the user `information-architecture.md`, `user-flow.md`, `state-model.md` and its `approved_business_rules` table.
2. Wait for explicit approval. Do not start P3 without it.
3. On approval: `human_approval = {status: approved, approved_at: <ISO8601>, approved_file_hashes: {<3 P2 paths>: sha256}}`.
4. If the user requests changes: return to P2 (this does not count toward `failure_count`); the same gate is re-passed afterwards.
5. If a later gate returns to P2, approval is revoked and this same gate runs again. It is never a second approval point.

## 6. Halt

A Halt is an error or exception, never an approval. Show: the cause, the attempted fixes (from `return_history`), and the decision needed. Wait for the user. Reset a gate's `failure_count` to 0 only when the user explicitly resolves the cause and says to resume; record the reset and reason in `return_history`.

Halt conditions: rules changed · state.json corrupt or missing key · 0 change inputs · more than 2 automated fixes at one gate · edit-scope violation · Figma destination cannot be created or must change · `figma_destination` null at G3 · blocklist file missing · verify.js exit 2 · Node.js unavailable.

## 7. Finish

After G5 passes: set `current_stage: done`. Report to the user: the 16 output paths, the destination Figma URL, Standard Fails and the 4 Needs Human Review items (from `qa-report.md`), and unresolved questions with owners.
