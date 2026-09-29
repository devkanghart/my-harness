---
objects:
  account:
    fields: [id, client_name, recipient_names, category, tags, sensitivity_level, sensitivity_note, workflow_status, total_outstanding, currency, oldest_invoice_date]
  invoice:
    fields: [id, account_id, recipient_id, invoice_number, issued_at, due_at, amount, amount_outstanding, currency, financial_status]
# Labels must come from PRD 7.1–7.3 and never repeat across families (G2-4, G2-5).
status_families:
  financial: [Due, Overdue, Paid, Cancelled]
  payment_activity: [No payment link, Payment link created, Payment link sent, Payment link expired, Reminder sent, Payment confirmed]
  workflow: [Active in Payments Due, Archived from queue]
# Checked by G2-10 and G4-4c/d/e. Action names are fixed.
transitions:
  - action: send_reminder
    applies_to: sensitive
    requires: [note_reviewed]          # or shows: [sensitivity_notice] — at least one
    shows: [sensitivity_notice]
    sets: {}
    unchanged: [workflow_status, financial_status]
  - action: link_created
    applies_to: all
    requires: []
    shows: []
    sets: {}
    unchanged: [workflow_status, financial_status]
  - action: link_sent
    applies_to: all
    requires: []
    shows: []
    sets: {}
    unchanged: [workflow_status, financial_status]
  - action: reminder_sent
    applies_to: all
    requires: []
    shows: []
    sets: {}
    unchanged: [workflow_status, financial_status]
  - action: payment_confirmed
    applies_to: all
    requires: []
    shows: []
    sets: { in_active_queue: false }
    unchanged: []
  - action: archive
    applies_to: all
    requires: [confirmation]
    shows: []
    sets: { workflow_status: archived }
    unchanged: [financial_status, amount_outstanding]
  - action: restore
    applies_to: all
    requires: []
    shows: []
    sets: { workflow_status: active }
    unchanged: [financial_status, amount_outstanding]
# Approved together with IA and user flow at the only Human Approval Gate. IDs: BR-01, BR-02, …
approved_business_rules:
  - id: BR-01
    rule: ""
    source: ""
---

# State model

## Account and invoice

## Status families

## Transitions

## Approved business rules

| ID | Rule | Source |
|---|---|---|
| BR-01 | | |

## Revision note
