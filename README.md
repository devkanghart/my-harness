# Receivables Design Harness

A Claude Code harness that turns changing B2B payment requirements and UAT feedback into a validated **account-level receivables workflow**, a **Figma design** and an **engineer-ready handoff** — for redesigning a static B2B Payment Portal into an operational "Receivables Workspace".

It replaces one Senior Product Designer's manual process (collect references → analyse → specify → design key screens → reconcile UAT feedback → hand off) with five sequential stages, five subagents, machine-checkable gates and exactly one human approval point.

All data is fictional (`Northstar Care` sample data). No real customer, company or production data is used.

## Pipeline

```txt
P1 Evidence ──G1──▶ P2 Workflow ──G2──▶ 🔒 Human approval ──▶ P3 Design ──G3──▶ P4 Validation ──G4──▶ P5 Handoff ──G5──▶ done
```

| Stage | Agent | Produces (`runs/<slug>/…`) | Gate checks (examples) |
|---|---|---|---|
| P1 Evidence | `evidence-agent` | requirements labelled Evidence / Hypothesis / Conflict / Unknown, with sources; open questions | all 6 references read, every Evidence has a source file |
| P2 Workflow | `workflow-agent` | information architecture, user flows, state model, ID'd business rules (`BR-xx`) | 3 status families never merged, archive/link/reminder transitions never change financial status |
| **Human approval** | Senior Product Designer | approves P2 (the only approval point) | P2 file hashes recorded; any later change revokes approval |
| P3 Design | `design-agent` | Figma frames in the run's own file + screen inventory, component states, UI copy | 3 key frames at 1440px + 7 states, account detail as full view, Figma destination check |
| P4 Validation | `qa-gatekeeper` | QA report (12 Critical AC + 5 service conditions + 28 Standard + 4 human-review items), revision log | Critical Fail = 0, totals reconcile to £0.00, no PII / blocklisted names / AI-score language / unlisted IDs |
| P5 Handoff | `handoff-agent` | handoff, implementation notes, unresolved questions with owners | every screen linked, every action has an interaction rule |

- **Orchestrator:** the main Claude Code session, driven by [`.claude/skills/receivables-harness/SKILL.md`](.claude/skills/receivables-harness/SKILL.md). It runs stages, calls agents, runs `scripts/verify.js`, manages `state.json`, and hashes files before and after every agent call to catch edits outside the agent's folder.
- **Gates:** [`scripts/verify.js`](scripts/verify.js) reads YAML front matter only and exits `0` pass / `1` fail (one return stage) / `2` halt. All thresholds live in [`harness/rules.yaml`](harness/rules.yaml).
- **Failures:** each failure returns to exactly one earlier stage; max 2 automated fixes per gate, then the run halts for a human.

Specs: [`CLAUDE.md`](CLAUDE.md) · [`harness-purpose.md`](harness-purpose.md) · [`pipeline.md`](pipeline.md) · [`artifacts.md`](artifacts.md) · [`gates.md`](gates.md) · [`roles.md`](roles.md). Reference documents: [`references/`](references/).

## How to run

Requirements: Claude Code, Node.js ≥ 18, the Figma MCP connector (for P3).

```bash
npm install
npm test
```

1. Create `runs/<slug>/inputs/` and add at least one change input (UAT feedback, stakeholder requirement, UX problem, constraint, or Figma reference).
2. Create `harness/company-blocklist.local.txt` (one real company or clinic name per line; git-ignored). The G4 gate halts if it is missing.
3. In Claude Code, say: `Run the receivables design harness for <slug>.` (Korean: `<slug>에 대해 Receivables Design Harness를 실행해줘.`)
4. Approve (or request changes to) the P2 files when the run stops at the human approval gate.
5. To continue after a halt: `Resume the receivables design harness for <slug>.`

Check a single gate: `node scripts/verify.js --run runs/<slug> --gate G3`

`runs/` is git-ignored: run outputs can derive from real UAT inputs, so they are never committed.

## Example run: `payment-portal-redesign`

Figma file: **[Receivables Workspace - payment-portal-redesign](https://www.figma.com/design/lCpVuxq7heXRdfzdZByR0f)**

| Page | What it is |
|---|---|
| [V2 - Human Design Review](https://www.figma.com/design/lCpVuxq7heXRdfzdZByR0f?node-id=17-2) | **The deliverable.** Redesigned after a human design review: compact queue table, full account detail view (replaces the drawer, decision D-15), left navigation only, focused modals for payment link, reminder and archive. 10 required states. |
| [Design specifications](https://www.figma.com/design/lCpVuxq7heXRdfzdZByR0f?node-id=17-3) | Focus order, accessible names, text overflow, contrast evidence, keyboard rules, component states, saved-view rules. Kept out of the product frames. |
| [V1 - Harness Generated](https://www.figma.com/design/lCpVuxq7heXRdfzdZByR0f?node-id=0-1) | The first, fully harness-generated design, kept unchanged for comparison. |

How the run went: P2 was approved once with 14 designer decisions (D-01…D-14), a first QA pass found 4 accessibility Standard Fails which were fixed in a targeted revision, and a human design review then produced V2 (D-15, R-06). 48 approved business rules. Automated fix count: 0 at every gate.

## What is automated vs. what still needs human review

**Automated (verified by `scripts/verify.js` and the test suite) — final state:**

| Check | Result |
|---|---|
| `npm test` | 31/31 pass |
| G1 Evidence · G2 Workflow · G3 Design · G4 Service & QA · G5 Handoff | all pass |
| Critical acceptance criteria | 12/12 Pass |
| Critical service conditions | 5/5 Pass |
| Standard acceptance criteria | 28/28 Pass |
| Data safety review | Pass |

Gate passage proves **structure and rule consistency**, not visual quality or usability. The QA verdicts are an agent's judgement with evidence references; the script checks that every verdict exists, has resolvable evidence, and that none failed.

**Still requires human design / usability review:**

- The four final review questions from the acceptance criteria (usability testing):
  - Can a user identify the accounts needing attention within 10 seconds?
  - Can they explain the difference between financial status and workflow status?
  - Can they take an action without losing their place in the queue?
  - Is any content duplicated without helping the decision?
- Visual review items raised by QA on V2 (H-1…H-9), for example: saved-view rules shown only in tooltips; the filter menu open state drawn only on the specifications page; returning to the queue with context restored is specified but not drawn; selected and focused saved-view states look alike; cell max widths must be enforced in the build.
- Open product questions with owners (e.g. debt-age filter bucket labels, whether a note review is recorded in activity, account-detail focus choices).

These are listed in the run's `p4-validation/qa-report.md` and `p5-handoff/unresolved-questions.md` (local, not committed).

## Repository layout

```txt
CLAUDE.md                     harness rules loaded by Claude Code
.claude/agents/               5 subagents (evidence, workflow, design, qa-gatekeeper, handoff)
.claude/skills/receivables-harness/SKILL.md   orchestrator
harness/rules.yaml            single source of truth for gates and lists
harness/templates/            front-matter templates for the 16 outputs + state.json
scripts/verify.js             gate checker
tests/verify.test.js          gate tests
references/                   PRD, design direction, service stories, work process, acceptance criteria, sample data
*.md (root)                   interview specs: purpose, pipeline, artifacts, gates, roles
```
