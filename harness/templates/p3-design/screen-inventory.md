---
key_frames:                              # exactly 3, width 1440
  - { name: Payments Due default queue, width: 1440 }
  - { name: Filtered or saved queue view, width: 1440 }
  - { name: Account detail drawer, width: 1440 }
states:                                  # exactly 7
  - { name: Create payment link, type: interaction, parent_frame: Account detail drawer }
  - { name: Send reminder, type: interaction, parent_frame: Account detail drawer }
  - { name: Archive confirmation, type: interaction, parent_frame: Account detail drawer }
  - { name: Archived result and restore, type: state, parent_frame: Payments Due default queue }
  - { name: Loading, type: state, parent_frame: Payments Due default queue }
  - { name: Empty queue, type: state, parent_frame: Payments Due default queue }
  - { name: No results, type: state, parent_frame: Filtered or saved queue view }
drawer_width: 480                        # 440–520
# Sample-data accounts shown. scenario must cover: multiple_invoices, no_payment_link, link_sent_unpaid, sensitive_account.
# total must equal the invoice sum and sample-data (G4-5). Names only from sample-data (G4-7).
accounts_shown:
  - client: Amara Lewis
    pets: [Pixel]
    scenario: link_sent_unpaid
    workflow_status: active
    total: "£486.50"
    invoice_amounts: ["£186.50", "£220.00", "£80.00"]
business_rules_used: []
---

# Screen inventory

## Key frames

## States

## Accounts shown

## Revision note
