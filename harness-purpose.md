# Harness Purpose (R2, approved)

## Purpose

> This harness turns changing B2B payment requirements and UAT feedback into a validated account-level workflow, design specification and handoff-ready output.

## Inputs

### Reference documents (required every run: 6 of 6)

| # | Document | Current path |
|---|---|---|
| 1 | PRD | `references/PRD.md` |
| 2 | design | `references/design.md` |
| 3 | story-service | `references/story-service.md` |
| 4 | story-work | `references/story-work.md` (renamed from `work-process.md` in R4) |
| 5 | acceptance-criteria | `references/acceptance-criteria.md` |
| 6 | sample-data | `references/sample-data.md` |

R4: all 6 reference documents live in `references/` and are read-only for every agent. PRD internal `references/` paths now match; PRD text is unchanged.

### Change inputs (at least 1 of 3 groups required)

| Group | Items |
|---|---|
| A | UAT feedback, stakeholder requirement |
| B | UX problem found in existing screens, screen/interaction to revise |
| C | New technical constraint, unresolved question, Figma reference |

If change inputs = 0, do not start. Ask the user what they want to change.

## User

- **Primary harness user (runs it):** Senior Product Designer, exactly 1.
- **Non-running participants:** PM, Payments team, engineers. They provide requirements and feedback, review intermediate design decisions, and check results and handoff documents.

## Completion criteria

1. Evidence and Hypothesis are distinguished.
2. The Account–Invoice relationship is defined.
3. Financial status, Payment activity and Workflow status are defined separately.
4. All 10 required named design states are traceable (see Design scope).
5. Critical acceptance criteria: 12 of 12 Pass, Critical Fail = 0.
6. A handoff document engineers can implement from is produced.

### Acceptance criteria classification (final approval in R5)

**Critical (12)**: all must Pass.

| # | Criterion | Source | Judged by |
|---|---|---|---|
| 1 | Each row represents a client account, while preserving access to individual invoices. | Checkbox | Script / QA |
| 2 | Total outstanding reconciles with the displayed outstanding invoices. | Checkbox | Script / QA |
| 3 | Payment-link and reminder history are distinguishable from invoice status. | Checkbox | Script / QA |
| 4 | Any priority treatment exposes its rule and does not imply an undisclosed AI decision. | Checkbox | Script / QA |
| 5 | Create-link and send-reminder actions prevent duplicate submission while loading. | Checkbox | Script / QA |
| 6 | Completion feedback describes the action taken without implying payment. | Checkbox | Script / QA |
| 7 | `Archive from queue` requires confirmation. | Checkbox | Script / QA |
| 8 | Archive copy explicitly states that invoice and payment status will not change. | Checkbox | Script / QA |
| 9 | An archived account can be restored to the active queue. | Checkbox | Script / QA |
| 10 | Confirmed payment is the only state that uses payment-success language. | Checkbox | Script / QA |
| 11 | Status is not communicated by colour alone. | Checkbox | Script / QA |
| 12 | Every business rule used in P3 and P5 must exist in P2's Approved business rules list; the number of business rules not in the approved list must be 0. | Final review question 5 (rewritten in R3) | Script (P4): every ID in `business_rules_used` exists in P2 Approved business rules |

**Standard (28)**: the remaining 28 of 39 checkboxes. Fails are recorded in the QA report and do not stop the run.

**Needs Human Review (4)**: Final review questions 1–4.

> R3 change: Critical 12 no longer requires a human Pass/Fail in P4. Its human judgement is merged into the single P2 Human Approval Gate, where Approved business rules (BR-01, BR-02, …) are approved together with IA, user flow and state model. This does not add an approval point.

## Design scope

Includes Figma generation and the handoff package.

| Type | Count | Items |
|---|---|---|
| Key screen frame | exactly 3 | Payments Due default queue; Filtered or saved queue view; Account detail |
| Interaction/state coverage | exactly 7 | Create payment link; Send reminder; Archive confirmation; Archived result and restore; Loading; Empty queue; No results |
| Total required named design states | 10 | Traceable in both `screen-inventory.md` and `figma-output.md` |

- Key frame width: 1440px.
- Account detail: full view in the main content area, not a drawer (D-15, human design review 29 Sep 2026; was a 440–520px drawer).
- Each of the 7 states may be an independent frame, a component variant or a clearly named section.

### Account scenarios shown inside the 3 key frames (checked in R5 Gate 3)

Not added as separate design states. Represented with `references/sample-data.md` accounts:

1. Account with multiple invoices
2. Account with no payment link
3. Account with a sent link but no confirmed payment
4. Sensitive account
