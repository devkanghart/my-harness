# Pipeline (R3, approved)

Purpose and completion criteria: [harness-purpose.md](harness-purpose.md).

## Execution order

- Stages run strictly in order: P1 → P2 → P3 → P4 → P5.
- No parallel execution between stages. A stage starts only after the previous stage's gate passes.
- Inside P4 only, automated checks and the Human Review list may run in parallel.

## Stages

| Stage | Inputs | Work | Outputs | Gate | Return on failure |
|---|---|---|---|---|---|
| **P1 Evidence and Requirements** | Required: 6 reference documents in `references/`; ≥1 change input (group A/B/C) in `runs/<slug>/inputs/`. Optional: UAT feedback, meeting notes, existing screens, Figma reference, Uibowl reference | Read all inputs. Classify each requirement as exactly one of Evidence / Hypothesis / Conflict / Unknown. Assign ID and source. Record open questions. Replace real names, clinic names and contact details with `[client]`, `[clinic]`, `[redacted]` | `evidence-summary.md`, `requirements.md`, `open-questions.md` | Gate 1 | P1 |
| **P2 Workflow and State Model** | Gate-passed P1 outputs (3), `references/` (6), `runs/<slug>/inputs/` | Define Account–Invoice relationship. Separate Financial status / Payment activity / Workflow status. Separate Search / Filter / Sort. Write IA and core user flow. Define start and end states. Write Approved business rules with IDs | `information-architecture.md`, `user-flow.md`, `state-model.md` (incl. `Approved business rules`) | Gate 2 + **Human Approval Gate (the only one)** | P2 |
| **P3 Design Concept** | Approved P2 outputs (3), `references/` (6), `runs/<slug>/inputs/`. Optional (reference only): allowed Uibowl reference, Figma reference | Design 3 key frames + 7 interaction/states. Show the 4 sample-data account scenarios inside the 3 key frames. Create or modify in Figma via Figma MCP. List `business_rules_used` | `design-concept.md`, `screen-inventory.md`, `component-states.md`, `figma-output.md` | Gate 3 | P3 |
| **P4 Validation** | P3 outputs (4), `references/PRD.md`, `references/design.md`, `references/acceptance-criteria.md`, `references/sample-data.md`, P2 Approved business rules | Run automated checks and build Human Review list (parallel). Classify Critical / Standard / Needs Human Review. Check unapproved business rule count. Assign exactly one return stage per failure | `qa-report.md`, `failed-criteria.md`, `revision-log.md` | Gate 4 | See return rules |
| **P5 Handoff** | Gate-passed P1–P4 outputs, `references/` (6), `runs/<slug>/inputs/`, `state.json`, Figma output | Finalise design states, component and interaction rules, implementation dependencies. Assign owner or next step to every unresolved question. List `business_rules_used` | `handoff.md`, `implementation-notes.md`, `unresolved-questions.md` | Gate 5 | Explicit G5 mapping (below) |

## Human Approval Gate

- Location: after P2, exactly one place.
- Approved together: `information-architecture.md`, `user-flow.md`, `state-model.md`, and its `Approved business rules`.
- The gate may be passed more than once in the same run when a later failure returns to P2. This is re-passing the same gate, not an additional approval point.
- P3 does not start until (re-)approval is given.
- No other stage asks a person for approval or Pass/Fail.

## Business rules

- IDs are assigned in P2: `BR-01`, `BR-02`, `BR-03`, …
- `state-model.md` → `Approved business rules` table with columns: ID, rule, source.
- P3 and P5 outputs include a structured `business_rules_used` list of BR IDs.
- Check: every ID in `business_rules_used` exists in Approved business rules. Missing ID count = 0.
- Adding a new business rule in natural language without an ID is not allowed.
- A new rule needing judgement → return to P2 (re-approval at the same gate).
- Exact file format and check method: decided in R5.

## Return rules

Exactly one return stage per failure.

| Failure type | Return to |
|---|---|
| Missing evidence or source | P1 |
| Account, Invoice, status or workflow definition is wrong | P2 |
| Business rule not in Approved business rules | P2 |
| Total, currency format or sample-data value transferred incorrectly to a screen | P3 |
| Screen, component or interaction does not meet criteria | P3 |
| Unlisted identifier in `ui_copy` or `data_safety_review` Fail | P3 |
| G5: handoff file missing, or unresolved question without owner/next step | P5 |
| G5: required screen without Figma frame link, or main action without interaction rule | P3 |
| G5: Critical QA Fail | `return_stage` recorded by G4 |
| G5: business rule not in approved list | P2 |

## References

- Uibowl reference and existing Figma reference are optional P1 inputs. P3 may consult them during design exploration.
- They are not a required task, not a gate, and no reference gallery is a required output.
- `references/story-work.md` (formerly work-process.md) steps 1–4 are not a separate stage. The R1-B gate "레퍼런스를 이 정도 모으면 충분한가?" is not used.
