# Fictional Sample Data

Use the fictional service business **Northstar Care**. All people, pets, invoices and values below are synthetic.

## Queue dataset

| Account | Pet(s) | Total outstanding | Invoices | Oldest invoice | Payment activity | Category | Sensitivity |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| Amara Lewis | Pixel | £486.50 | 3 | 47 days overdue | Link sent 8 days ago; no payment | No account tag | None |
| Theo Bennett | Miso, Nori | £1,284.00 | 4 | 62 days overdue | No payment link | Insurance-funded | Sensitive |
| Sophie Martin | Clover | £92.40 | 1 | Due in 3 days | No payment link | Care plan | None |
| Daniel Okafor | Luna | £640.00 | 2 | 21 days overdue | Reminder sent yesterday | No account tag | None |
| Priya Shah | Archie | £2,430.75 | 5 | 90 days overdue | Link expired 12 days ago | No account tag | None |
| Jamie Evans | Olive | £175.20 | 1 | 6 days overdue | Link sent today | Care plan | None |
| Mia Chen | Bento | £0.00 | 0 | No outstanding invoice | Payment confirmed today | No account tag | None |

Expected queue behaviour:

- Mia Chen should not remain in the active Payments Due queue after confirmed payment.
- `Sensitive` is an account-handling indicator, not a debt or risk score.
- `Care plan` and `Insurance-funded` are account categories, not payment statuses.
- `Link sent`, `Reminder sent` and `Link expired` are payment-activity states, not invoice statuses.

## Account detail: Amara Lewis

**Client:** Amara Lewis  
**Pet:** Pixel  
**Total outstanding:** £486.50  
**Account category:** No account tag  
**Primary suggested action:** Send reminder

### Outstanding invoices

| Invoice | Issued | Due | Amount | Financial status |
| --- | --- | --- | ---: | --- |
| INV-10428 | 29 Jul 2026 | 13 Aug 2026 | £186.50 | Overdue |
| INV-10802 | 19 Aug 2026 | 3 Sep 2026 | £220.00 | Overdue |
| INV-11176 | 13 Sep 2026 | 28 Sep 2026 | £80.00 | Overdue |

### Payment activity

- 21 Sep 2026, 10:14 - Payment link created for £486.50.
- 21 Sep 2026, 10:15 - Link sent by email.
- No confirmed payment received.

Expected behaviour: the £486.50 total must reconcile with the three invoices. Sending a reminder updates payment activity but does not change the financial status.

## Account detail: Theo Bennett

**Client:** Theo Bennett  
**Pets:** Miso and Nori  
**Total outstanding:** £1,284.00  
**Account category:** Insurance-funded  
**Sensitivity:** Use discreet communication; review account note before contacting.  
**Primary suggested action:** Review account

### Outstanding invoices

| Invoice | Pet | Issued | Due | Amount | Financial status |
| --- | --- | --- | --- | ---: | --- |
| INV-09771 | Miso | 12 Jul 2026 | 29 Jul 2026 | £540.00 | Overdue |
| INV-10108 | Miso | 26 Jul 2026 | 10 Aug 2026 | £264.00 | Overdue |
| INV-10556 | Nori | 9 Aug 2026 | 24 Aug 2026 | £360.00 | Overdue |
| INV-10993 | Nori | 28 Aug 2026 | 13 Sep 2026 | £120.00 | Overdue |

Expected behaviour: do not promote immediate contact before the note is reviewed. Do not label Theo as high risk or a bad payer.

## Archive confirmation

**Title:** Archive this account from Payments Due?  
**Body:** This removes Theo Bennett from the active Payments Due queue. It does not change the invoices, amounts owed or payment status. You can restore the account from Archived.  
**Primary action:** Archive from queue  
**Secondary action:** Cancel

## Empty and no-results states

### Empty active queue

**Title:** Nothing is currently due  
**Body:** Accounts will appear here when an invoice requires payment follow-up.

### No search results

**Title:** No matching accounts  
**Body:** Try a different client, pet or invoice reference, or clear the active filters.

### Loading

Use table-row skeletons that preserve the final column structure. Keep the search, view and filter context visible, and prevent duplicate actions.
