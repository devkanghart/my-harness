---
# evidence: figma:<node_id> or <file path>#<section-id>. Empty or unresolvable evidence = Fail → P3.
critical_acceptance:                     # exactly CAC-01 … CAC-12
  - { id: CAC-01, verdict: "", evidence: [] }
  - { id: CAC-02, verdict: "", evidence: [] }
  - { id: CAC-03, verdict: "", evidence: [] }
  - { id: CAC-04, verdict: "", evidence: [] }
  - { id: CAC-05, verdict: "", evidence: [] }
  - { id: CAC-06, verdict: "", evidence: [] }
  - { id: CAC-07, verdict: "", evidence: [] }
  - { id: CAC-08, verdict: "", evidence: [] }
  - { id: CAC-09, verdict: "", evidence: [] }
  - { id: CAC-10, verdict: "", evidence: [] }
  - { id: CAC-11, verdict: "", evidence: [] }
  - { id: CAC-12, verdict: "", evidence: [] }
critical_service_conditions:             # exactly a … e
  - { id: a, verdict: "", evidence: [] }
  - { id: b, verdict: "", evidence: [] }
  - { id: c, verdict: "", evidence: [] }
  - { id: d, verdict: "", evidence: [] }
  - { id: e, verdict: "", evidence: [] }
standard: []                             # exactly 28 entries: { id, verdict, evidence }
needs_human_review:                      # Final review questions 1–4; never auto-Pass, not an approval gate
  - { id: NHR-1, question: "Can a user identify the accounts needing attention within 10 seconds?" }
  - { id: NHR-2, question: "Can they explain the difference between financial status and workflow status?" }
  - { id: NHR-3, question: "Can they take an action without losing their place in the queue?" }
  - { id: NHR-4, question: "Is any content duplicated without helping the decision?" }
data_safety_review:                      # unlisted real names, clinics, customers in P3 outputs and Figma
  verdict: ""
  evidence: []
---

# QA report

## Critical acceptance criteria (12)

## Critical service conditions (5)

## Standard (28)

## Needs Human Review (4)

## Data safety review
