---
actions:                                 # 4 main actions × Default/Loading/Success/Error
  - { name: Create payment link, states: [Default, Loading, Success, Error] }
  - { name: Send reminder, states: [Default, Loading, Success, Error] }
  - { name: Archive from queue, states: [Default, Loading, Success, Error] }
  - { name: Restore, states: [Default, Loading, Success, Error] }
# family: financial | payment_activity | workflow | category | sensitivity
# Status labels must come from the PRD lists; every status badge needs a text label (not colour alone).
# Archived never uses a green/success token. Paid language only for financial Paid or Payment confirmed.
badges:
  - { family: financial, label: Overdue, token: "" }
  - { family: payment_activity, label: Payment link sent, token: "" }
  - { family: workflow, label: Archived from queue, token: "" }
---

# Component states

## Actions

## Badges and tags

## Revision note
