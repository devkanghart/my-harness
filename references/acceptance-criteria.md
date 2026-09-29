# Acceptance Criteria

## Queue comprehension

- [ ] The default screen clearly communicates that this is an active Payments Due work queue.
- [ ] Each row represents a client account, while preserving access to individual invoices.
- [ ] Client, pet, total outstanding, invoice count and oldest invoice age are visible in the queue.
- [ ] Payment-link or reminder activity is understandable without opening the account.
- [ ] Currency and dates use consistent formats and alignment.
- [ ] Long names and multiple pets do not break the row structure.

## Find and prioritise

- [ ] Search supports client, pet and invoice references.
- [ ] Account category, payment-link state, amount due, debt age and sensitivity can be filtered.
- [ ] Sorting is presented separately from filtering.
- [ ] Active filters are visible and can be cleared.
- [ ] A no-results state explains how to return to the full queue.
- [ ] Any priority treatment exposes its rule and does not imply an undisclosed AI decision.

## Account detail

- [ ] Opening account detail preserves the queue's filter, sort and scroll context.
- [ ] Total outstanding reconciles with the displayed outstanding invoices.
- [ ] Invoice number, dates, amount and financial status are available.
- [ ] Payment-link and reminder history are distinguishable from invoice status.
- [ ] The drawer provides direct access to invoice details.
- [ ] Closing the drawer returns focus to the originating account row.

## Actions and status meaning

- [ ] Only one primary action is emphasised in each context.
- [ ] Create-link and send-reminder actions prevent duplicate submission while loading.
- [ ] Completion feedback describes the action taken without implying payment.
- [ ] `Archive from queue` requires confirmation.
- [ ] Archive copy explicitly states that invoice and payment status will not change.
- [ ] An archived account can be restored to the active queue.
- [ ] Confirmed payment is the only state that uses payment-success language.

## Required states

- [ ] Populated default queue.
- [ ] Filtered or saved view.
- [ ] Account with multiple invoices.
- [ ] Account with no payment link.
- [ ] Account with a sent link but no confirmed payment.
- [ ] Sensitive account.
- [ ] Loading, empty queue and no-results states.
- [ ] Archive confirmation and archived result.

## Visual and accessibility review

- [ ] The interface remains scannable at realistic B2B data density.
- [ ] Status is not communicated by colour alone.
- [ ] Text and interactive controls meet accessible contrast expectations.
- [ ] Keyboard focus order follows the visual workflow.
- [ ] Icon-only controls have accessible names or visible labels.
- [ ] Drawers and confirmations have a clear title and close/cancel action.

## Final review questions

1. Can a user identify the accounts needing attention within 10 seconds?
2. Can they explain the difference between financial status and workflow status?
3. Can they take an action without losing their place in the queue?
4. Is any content duplicated without helping the decision?
5. Did the implementation introduce a business rule not supported by the documents?
