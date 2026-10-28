# BUG-098, BUG-099 and BUG-100

Local changes, 15 October 2026. Nothing deployed and no LMS data changed.

## Changes

- **098:** Tutor Attendance List and its payslip preview show tutor hourly rates, not parent rates. Amounts use the saved per-class payslip line when available; otherwise only Operations-approved completed classes contribute an estimate using the existing payslip rule (scheduled duration rounded up to 15 minutes × tutor hourly rate). Different rates are separate lines. Same-name tutors do not merge; duplicated report rows do not double the total. Historical attendance is attributed to the tutor on the schedule rather than a replacement currently assigned to the enrollment. The existing payslip-generation procedure is unchanged.
- **099:** Map TCT Bank is restricted to **AccountsAdmin** in Student List and Enrollment History, with a shared modal guard. The mapping API also requires AccountsAdmin. This intentionally excludes OperationsAdmin, Operations, Accounts, SalesAdmin, Admin, SuperAdmin and other roles from this specific mapping action; it does not change general bank-maintenance permissions. Existing Student List mapbank permission is still required there.
- **100:** Payroll starts with the active tutor roster and includes tutors with no schedules. Inactive tutors with selected-period classes or active payslips remain visible. Schedule and invoice matching use Tutor.Id; generation still receives Tutor.UserId, as the existing API expects. Invoice lookup uses tutor + selected month + year, not an arbitrary schedule ID. Rates no longer split a tutor into duplicate rows. Saved payslip totals are used for processed payroll. Counts/filters distinguish No classes taken, Pending and Processed. All rows reach the table's pagination, and stale month responses cannot overwrite the current selection.

## Deployment scope

Deploy matching **API and UI** after testing. **No new table, stored procedure or migration is required for these three fixes.** Earlier package-reconciliation changes have separate database prerequisites; this note does not remove them. Do not regenerate, edit or delete existing payslips as part of deployment.

## Acceptance tests on an isolated database copy

### BUG-098 — Payroll Admin → Tutor Attendance List

1. Choose a completed, Operations-approved class with different parent and tutor rates, for example parent ₹1,000/hour and tutor ₹250/hour.
2. Expand the tutor row. Verify the label is Tutor Rate (₹/hour), the rate is ₹250 and no parent-payment column appears.
3. For a 90-minute class before invoicing, expect ₹375. For 61 minutes, expect ₹312.50. Unapproved, cancelled and incomplete classes must not add an estimated payable amount.
4. Open the payslip preview and compare the same rows. Once issued, compare per-class saved amounts with View Payslip. Changing the current agreed rate must not rewrite a saved payslip amount.
5. Check two subjects/rates for one tutor, two tutors with the same name, and a tutor replacement. Verify no merged identities or duplicated totals.

### BUG-099 — Student List and Enrollment History

1. Log in as OperationsAdmin; search for a student in both lists. Map TCT Bank must be absent. Other actions and search must remain usable.
2. Repeat as Operations, Coordinator, PayrollAdmin and Accounts: the action must be absent.
3. Log in as AccountsAdmin with the existing mapbank permission. Verify Map TCT Bank opens, loads bank details, saves a test mapping and reloads correctly.
4. On the test environment, a direct POST/PUT to `/api/TCTBankDetails/bankdetailsforpayment` using an OperationsAdmin token must return 403 without changing the mapping. Repeat as another excluded role. Do not share tokens.

### BUG-100 — Payroll Admin → Tutor Payroll

1. Prepare four tutors: no schedules; scheduled but no completed classes; completed classes pending approval/payroll; and an already-issued payslip for the selected month.
2. All should appear under All. The first two belong to No classes taken; the third to Pending; the fourth to Processed.
3. Give a tutor a September payslip and October completed classes. October must remain Pending until October payroll exists; September must remain Processed.
4. Verify an unapproved completed class shows Waiting for Operations approval, not Generate Payslip. A tutor with no completed classes cannot generate payroll. A processed tutor links to the existing payslip.
5. Compare the processed amount to the saved payslip, including after a current tutor-rate change. A historical payslip must remain visible if the tutor is now inactive.
6. Test more than ten tutors and navigate pagination. Every returned tutor must be reachable.
7. Change months quickly, navigate December → January and back, change year, refresh and simulate an API failure. The latest selected month wins; a failure shows an error/Retry rather than misleading empty results.
8. Generate a payslip only for a test tutor with approved classes. Double-click must send one request. Confirm the tutor becomes Processed for the selected month and the saved payslip opens. Switching months while generation is in flight must not replace the new month's rows.

## Validation and limits

- API regression suite: 87 passed; API build passed.
- Focused UI regression suites for these changes plus Enrollment History search: 27 passed. Broader focused regression run (including billing, assignment, assessment and dashboards): 88 passed across 12 suites.
- UI production build: passed. Existing dependency/bundle-size warnings remain; API build warnings also remain.
- Database query execution, browser role testing and live payroll generation have not been performed. Automated summary tests use synthetic data; they do not validate deployed SQL data or the deployed version of `usp_GenerateTutorInvoice`.
- The read-side estimate follows the checked-in hours-based payslip procedure. Confirm the server has that existing procedure version before comparing pre-invoice estimates. No new payroll calculation policy or payslip repair is introduced here.
