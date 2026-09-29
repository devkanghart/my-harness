# Receivables Workspace PRD - Action-oriented B2B Payment Operations

This PRD defines a fictional, presentation-safe redesign of a B2B payments portal. The product should help operational teams move from reviewing a static list of invoices to understanding and acting on client accounts in one coherent workspace.

This is not a consumer payment experience or an accounting platform. The core goal is to make outstanding-payment work faster, clearer and harder to misinterpret.

---

## 1. Background

Operational teams in high-volume service businesses may manage hundreds of client accounts and unpaid invoices alongside other administrative responsibilities.

In the current model, payment work is often fragmented:

- invoices appear as separate rows even when they belong to the same client account;
- `Payments Due` and `Clients` can overlap, creating uncertainty about where to begin;
- search, filters and sorting are not always clearly separated;
- payment-link activity is easy to confuse with invoice or payment status;
- important actions may be hidden in menus or require additional navigation;
- opening an invoice or client record can cause users to lose their place in the work queue;
- archiving can be misunderstood as cancelling, paying or writing off an invoice.

As a result, users repeatedly reconstruct the same context before deciding what to do.

The redesigned workspace must answer four questions quickly:

1. Which client accounts require attention?
2. How much is outstanding, across which invoices and for how long?
3. What payment activity has already taken place?
4. What action can the user safely take next?

---

## 2. Product vision

Receivables Workspace is a calm, intelligent operational environment for managing payment follow-up.

Users should not merely view a database of invoices. They should be able to triage work, understand account context and complete a follow-up action without navigating across multiple disconnected pages.

One-line definition:

> Receivables Workspace helps busy operations administrators find client accounts requiring payment follow-up, understand their invoices and payment activity in one place, and take the appropriate next action without losing context.

---

## 3. Core user stories

### 3.1 As an operations administrator

I want to see which client accounts need attention so that I can decide where to start without inspecting every invoice individually.

### 3.2 As an operations administrator reviewing an account

I want to understand the total outstanding amount, individual invoices, invoice age and recent payment activity in one place so that I do not repeat work or send inappropriate follow-up.

### 3.3 As an operations administrator taking action

I want to create a payment link, send a reminder or open the relevant invoices from the account context so that I can progress the work efficiently.

### 3.4 As an operations administrator managing the queue

I want to remove an account from my active work queue without changing its financial status so that the queue reflects what I am actively working on.

### 3.5 As an operations lead

I want statuses and actions to have consistent meanings so that different team members manage accounts safely and predictably.

---

## 4. User situation

- The primary user works in a busy operational environment and revisits the queue several times per day.
- One client may have several pets, projects or service recipients and several outstanding invoices.
- The user may not have created the original invoice or previous payment link.
- The oldest invoice may be more urgent than the newest invoice, while the total account value still matters.
- A payment link or reminder may have been sent without payment being received.
- Some accounts require discreet handling because of vulnerability, dispute or another sensitivity note.
- Account categories such as `Care plan` or `Insurance-funded` describe context, not financial status.
- Users need a fast default workflow but must retain access to underlying invoice detail.
- The product should support professional judgement rather than hiding it behind an unexplained score.

---

## 5. Core information architecture

The MVP contains the following structure:

```txt
[Payments Due]
Active account-level work queue

  [Saved views]
  Reusable entry points for common queue states

  [Search, filters and sort]
  Tools for narrowing and ordering the queue

  [Account detail drawer]
  Client, pet/service-recipient, invoices and payment activity

  [Payment actions]
  Create payment link, send reminder, view invoice

[Archived]
Accounts removed from the active work queue
```

The MVP does not require a standalone `Clients` page. Global search and account detail should first be tested as the route to client history. This remains a product hypothesis rather than an established requirement.

---

## 6. Functional requirements

### 6.1 Payments Due work queue

The default experience must display client accounts with unpaid invoices.

Each account row must include:

1. Client name
2. Pet or service-recipient name where relevant
3. Total outstanding amount
4. Number of outstanding invoices
5. Oldest invoice age or due date
6. Latest relevant payment activity
7. Account category or contextual tags
8. Sensitivity indicator where applicable
9. A clear route to account detail
10. A contextually valid next action

The queue must be account-level. Individual invoices remain accessible inside account detail.

Confirmed paid accounts must leave the active Payments Due queue. A successful link creation or reminder must not remove an account because payment has not been confirmed.

### 6.2 Search

Search must support:

1. Client name
2. Pet or service-recipient name
3. Invoice number

Search placeholder:

```txt
Search client, pet or invoice
```

No-results feedback must help the user clear filters or try a different reference.

### 6.3 Filters and sorting

Filters and sorting must remain conceptually separate.

Required filter dimensions:

1. Account category
2. Payment-link or reminder state
3. Amount due range
4. Debt age
5. Account sensitivity
6. Financial status where needed

Candidate sorting dimensions:

1. Oldest or newest invoice
2. Due date
3. Total outstanding amount
4. Client name

Active filters must be visible and easily reset.

### 6.4 Saved views

Saved views are a hypothesis to be tested. Initial candidates are:

1. All payments due
2. Needs attention
3. No payment link
4. Link sent, unpaid
5. Over 30 days
6. High value

Saved views must be based on transparent rules. They must not imply automated judgement that the user cannot inspect.

### 6.5 Account detail drawer

Opening an account should preserve the queue's scroll position, search, filters and sorting.

Account detail must include:

1. Client and pet/service-recipient identity
2. Total outstanding amount
3. Account category
4. Sensitivity notice where applicable
5. Outstanding invoice list
6. Invoice number, issue date, due date, amount and financial status
7. Payment-link and reminder activity timeline
8. Direct access to individual invoice details
9. A clear primary action
10. Relevant secondary actions

The sum of outstanding invoice amounts must reconcile with the total outstanding amount.

### 6.6 Create payment link

The user must be able to create a payment link for a supported outstanding amount.

The interaction must:

1. Show which account and amount the link relates to.
2. Prevent duplicate submission while processing.
3. Confirm that the link was created or sent.
4. Add the event to payment activity.
5. Keep invoice financial status unchanged until payment is confirmed.

### 6.7 Send reminder

The user must be able to send a follow-up reminder when appropriate.

The interaction must:

1. Show the recipient and related account context.
2. Respect a sensitivity notice or block the action until the note is reviewed.
3. Prevent duplicate submission while processing.
4. Add the reminder event to payment activity.
5. Avoid language implying that payment has been received.

### 6.8 Archive from queue

Archiving is a workflow-management action, not a financial action.

The confirmation must explain:

```txt
This removes the account from the active Payments Due queue.
It does not change the invoices, amounts owed or payment status.
You can restore the account from Archived.
```

Required behaviour:

1. Explicit `Archive from queue` action
2. Confirmation before completion
3. Removal from the active queue
4. Appearance in Archived
5. Ability to restore to the active queue
6. No change to invoice or payment status

### 6.9 Empty, loading and no-results states

The product must include:

1. Initial loading state using table-row skeletons
2. Empty active queue
3. No search results
4. No filtered results
5. Action-in-progress feedback
6. Action success feedback
7. Recoverable action-error feedback

Search, filter and view context should remain visible while data loads.

---

## 7. Status and permission structure

### 7.1 Financial status

Financial status describes the invoice itself:

```txt
Due
Overdue
Paid
Cancelled
```

### 7.2 Payment activity

Payment activity describes an action or event:

```txt
No payment link
Payment link created
Payment link sent
Payment link expired
Reminder sent
Payment confirmed
```

### 7.3 Workflow status

Workflow status describes whether the account appears in the active queue:

```txt
Active in Payments Due
Archived from queue
```

These three status families must not be merged into one ambiguous `Status` value.

### 7.4 User permissions

For the prototype, assume one authenticated operations role with permission to:

- view accounts and invoices;
- search, filter and sort the queue;
- create a supported payment link;
- send a reminder;
- archive and restore accounts.

Permission management and administrator configuration are outside the MVP.

---

## 8. Data model draft

The following model is conceptual and intended to keep design and prototype states internally consistent.

### Account

```txt
id
client_name
recipient_names[]
category
tags[]
sensitivity_level
sensitivity_note
workflow_status: active / archived
total_outstanding
currency
oldest_invoice_date
created_at
updated_at
```

### Invoice

```txt
id
account_id
recipient_id
invoice_number
issued_at
due_at
amount
amount_outstanding
currency
financial_status: due / overdue / paid / cancelled
```

### PaymentLink

```txt
id
account_id
invoice_ids[]
amount
status: created / sent / expired / paid
created_by
created_at
sent_at
expires_at
paid_at
```

### Reminder

```txt
id
account_id
payment_link_id
channel: email / sms
recipient
status: sending / sent / failed
created_by
created_at
sent_at
```

### ActivityEvent

```txt
id
account_id
type: link_created / link_sent / link_expired / reminder_sent / payment_confirmed / archived / restored
actor
metadata
created_at
```

### SavedView

```txt
id
name
filters
sort
scope: system / personal
```

---

## 9. MVP scope

### Must include

1. Account-level Payments Due queue
2. Search by client, pet/service recipient or invoice
3. Core filters and sorting
4. Account detail drawer
5. Multiple outstanding invoices
6. Payment activity timeline
7. Create-payment-link prototype
8. Send-reminder prototype
9. Archive confirmation
10. Archived view and restore
11. Loading, empty and no-results states
12. Fictional sample data from `references/sample-data.md`

### Excluded from MVP

1. Card entry and payment processing
2. Refunds and disputes
3. Accounting reconciliation
4. Reporting dashboards
5. Automated collections
6. Opaque AI priority scores
7. Client-facing portal
8. Full client CRM
9. Permission administration
10. Mobile layouts

### MVP decisions for this exercise

1. The default object in the queue is an account, not an invoice.
2. Invoice-level detail is retained inside account detail.
3. Account detail opens in a drawer to test context preservation.
4. Saved views may be shown but must remain clearly labelled as a hypothesis.
5. `Archive from queue` never changes financial status.

---

## 10. Product roadmap

### Phase 0: Workflow and state validation

1. Confirm terminology with operational users.
2. Validate account-level grouping.
3. Test whether the drawer preserves useful context.
4. Validate archive meaning.
5. Confirm filter and sorting priorities.

### Phase 1: Workspace MVP

1. Payments Due queue
2. Search, filters and sorting
3. Account detail
4. Payment-link and reminder actions
5. Archive and restore
6. Loading, empty and error states

### Phase 2: Personalisation and team operations

1. Personal saved views
2. Bulk selection for safe, supported actions
3. Assignment or ownership
4. Team-level activity visibility
5. Configurable queue rules

### Phase 3: Reporting and integrations

1. Collection performance reporting
2. Accounting and practice-management integrations
3. Reminder policy configuration
4. Multi-location reporting
5. Auditable action history

---

## 11. Value hypothesis

The redesigned workspace should create value by:

1. Reducing the time required to understand an account.
2. Reducing repeated or inappropriate follow-up.
3. Making payment-link activity visible to the whole operations team.
4. Preventing users from confusing workflow actions with financial outcomes.
5. Reducing navigation between separate client and invoice pages.
6. Improving consistency across team members.

This exercise does not claim measured business impact. The hypotheses require validation with users and product data.

---

## 12. Example account

### Amara Lewis and Pixel

```txt
Client: Amara Lewis
Pet: Pixel
Total outstanding: £486.50
Outstanding invoices: 3
Oldest invoice: 47 days overdue
Payment activity: Link sent 8 days ago; no confirmed payment
Account category: No account tag
Sensitivity: None
```

Expected workflow:

1. The account appears in Payments Due.
2. The row exposes total outstanding, invoice count, age and payment activity.
3. Opening the row reveals the three invoices and activity timeline.
4. The primary action is `Send reminder`.
5. Sending the reminder updates activity but does not change invoice status or remove the account from the queue.

Detailed fictional values are defined in `references/sample-data.md`.

---

## 13. Success metrics

### Usability measures

1. Time to identify three accounts requiring attention
2. Time to find total outstanding and oldest invoice
3. Task completion rate for sending a reminder
4. Task completion rate for finding an individual invoice
5. Correct interpretation of archive behaviour
6. Correct distinction between invoice status and payment activity

### Product measures

1. Average time from opening Payments Due to first valid action
2. Search and filter success rate
3. Accounts reopened because context was missed
4. Duplicate-link or duplicate-reminder rate
5. Accounts archived and restored
6. Payment-link conversion rate, interpreted with caution because payment outcome is affected by factors beyond interface quality

### Prototype success threshold

- A user identifies three relevant accounts within 10 seconds.
- A user finds the total, invoice count and oldest invoice without opening the account.
- A user correctly explains that a sent link does not mean an invoice is paid.
- A user correctly explains that archive does not change the amount owed.

---

## 14. Conditions

- Use only fictional data in `references/sample-data.md`.
- Treat existing payment-portal artefacts as functional and domain references, not visual constraints.
- Follow `design.md` for visual language, interaction rules and content style.
- Follow `references/acceptance-criteria.md` when reviewing the result.
- Preserve meaningful distinctions among account category, financial status, payment activity and workflow status.
- Do not expose company names, real customer data, production screenshots or internal API responses in a public repository.
- Do not invent AI recommendations, risk scores or collection policies.
- Do not redesign the surrounding accounting or practice-management platform.
- Build an operational workspace, not a decorative analytics dashboard.

---

## 15. Evaluation criteria

### Problem-solving completeness

The design should help users progress outstanding-payment work rather than merely display invoice records.

### Workflow clarity

The route from queue triage to account inspection and next action should be clear and continuous.

### Information hierarchy

Users should be able to compare account totals, invoice age and payment activity at realistic B2B data density.

### Status integrity

Financial status, payment activity and workflow status must remain distinct in copy, colour and component treatment.

### Action safety

Create-link, send-reminder and archive interactions should explain their effect, prevent duplicate submission and avoid false payment confirmation.

### Design quality

The experience should follow `design.md`: modern, calm, precise, accessible and operational rather than visually ornamental.

### Data consistency

Account totals must reconcile with invoice values, and all supplied states must behave consistently with the conceptual data model.

---

## 16. Deliverables

The prototype should include:

1. Payments Due default queue
2. Filtered or saved queue view
3. Account detail drawer
4. Create-payment-link interaction
5. Send-reminder interaction
6. Archive confirmation
7. Archived result and restore route
8. Loading state
9. Empty queue
10. No-results state
11. Component and state inventory
12. Brief explanation of which requirements are evidence-backed and which remain hypotheses

The agent should also report:

1. Design assumptions introduced
2. Acceptance criteria that could not be satisfied
3. Conflicts between the PRD, design system and available components
4. Any data or business rule required before implementation

---

## 17. One-line summary

Receivables Workspace turns a fragmented invoice list into an account-level operational queue where users can understand outstanding payment context and take safe follow-up actions without losing their place.
