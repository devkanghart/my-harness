# Design Direction: Receivables Workspace

## 1. Overview

The product should feel like a modern financial operations tool: precise, calm, fast and trustworthy. It should combine fintech-level clarity with the efficiency of a contemporary productivity application.

Design qualities:

- Action-oriented, not dashboard-oriented
- Information-dense without feeling cluttered
- Confident but not flashy
- Clear status semantics
- Fast to scan and operate repeatedly

Reference character: the precision of Stripe, the operational clarity of Ramp and the speed of Linear. Do not copy their interfaces or branding.

## 2. Colour

Prefer existing semantic tokens when available.

- Primary surface: warm white or neutral white.
- Secondary surface: very light cool neutral.
- Primary text: near-black neutral.
- Secondary text: medium neutral.
- Accent: one restrained indigo or blue.
- Critical overdue state: muted red, reserved for genuinely overdue financial items.
- Attention state: amber for items requiring review, not for decoration.
- Success: green only for confirmed payment or a successfully completed system action.
- Archived: neutral grey, never green.

Avoid colourful status pills for every field. Colour must communicate meaning.

## 3. Typography

Use the current product typeface or a neutral system sans serif.

- Page title: 24px, semibold.
- Queue summary or large amount: 20px, semibold.
- Section title: 16px, semibold.
- Table primary text: 14px, medium.
- Table secondary text and metadata: 12px, regular.
- Use tabular numerals for currency and dates where supported.
- Use sentence case throughout.

## 4. Layout and spacing

- Desktop-first, optimised around 1280-1440px.
- Persistent navigation may be represented but must not dominate the exercise.
- Main workspace uses a compact header, saved-view row, control bar and account-level data table.
- Use a 4px base grid with common increments of 8, 12, 16, 24 and 32px.
- Queue rows should support comfortable and compact density if the system permits.
- Account detail opens in a right-side drawer approximately 440-520px wide.
- Use subtle borders and surface changes rather than heavy shadows.

Do not turn every metric or action into a separate card.

## 5. Information architecture

### Workspace header

- Page name and short queue context.
- Active and archived views.
- Optional high-level count, not a row of decorative KPIs.

### Saved views

Candidate views:

- All payments due
- Needs attention
- No payment link
- Link sent, unpaid
- Over 30 days
- High value

Saved views are a hypothesis and must be approved before implementation.

### Control bar

- Search placeholder: `Search client, pet or invoice`.
- Filters: account category, payment-link state, amount due, debt age and sensitivity.
- Sorting remains a separate control.
- Show active filters clearly and provide a simple reset.

### Account-level queue

Recommended columns:

- Client and pet
- Total outstanding
- Invoices
- Oldest invoice
- Payment activity
- Account tags
- Next action

Rows open the account detail. Important actions should not be hidden behind an unexplained icon-only menu.

### Account detail drawer

- Client/pet identity and total outstanding.
- Outstanding invoice list with invoice number, issue date, due date, amount and status.
- Payment-link and reminder timeline.
- Account tags or sensitivity notice.
- Primary contextual action and secondary actions.

## 6. Component rules

- Status badge: reserved for true state; concise and semantically coloured.
- Tag: categorisation only, visually quieter than status.
- Currency: consistent GBP formatting and right alignment in tables.
- Dates: human-readable in the queue; exact dates available in details.
- Buttons: one clear primary action per context.
- Row actions: use visible text for high-frequency or consequential actions.
- Confirmation: state what changes and what does not.
- Toast: confirms system action, never implies payment unless payment is confirmed.

## 7. Interaction and motion

- Opening the account drawer should preserve scroll position, filters and selection.
- Updating a row after an action should not reorder the queue unexpectedly.
- Use subtle 150-200ms transitions for drawers and state changes.
- Show inline progress for create-link or reminder actions.
- Prevent duplicate actions while a request is running.
- Return keyboard focus to the originating row when the drawer closes.

## 8. Content style

- Use direct operational language.
- Prefer `Archive from queue` over `Archive` when space allows.
- Prefer `Payment link sent` over ambiguous `Active`.
- Distinguish `Due`, `Overdue`, `Paid`, `Link sent`, `Reminder sent` and `Archived from queue`.
- Avoid judgemental language such as `bad payer` or `problem client`.

## 9. Do / Don't

### Do

- Make totals, age and recent action easy to compare.
- Preserve account and invoice hierarchy.
- Keep filters and sorting separate.
- Explain workflow actions clearly.
- Use progressive disclosure for history and secondary metadata.
- Design all supplied states, not only the ideal populated view.

### Don't

- Do not build a generic analytics dashboard.
- Do not use oversized KPI cards, gradients or decorative charts.
- Do not invent AI recommendations or collection scores.
- Do not equate archiving with payment, cancellation or write-off.
- Do not hide all meaningful actions inside a three-dot menu.
- Do not show client and invoice information as unrelated duplicate records.
