# Bugfix verification and deployment notes

Updated 15 October 2026. Local source changes only; nothing deployed to production.

## Release status

**Not yet approved for production.** Builds and focused automated tests are not a substitute for end-to-end testing on an isolated copy of LMS data. The additional screenshot identifies BUG-085's selection as Recurring → No. of Months in Schedule Class. The user confirmed that a three-month schedule is paid as one full-period package. BUG-096 shows Assign Tutor saving; production request timings remain unverified. No real invoice, payment, attendance, or email was created during validation.

| Bug | Change in this patch | Remaining verification |
| --- | --- | --- |
| 037 | Persist reminder/message together; retry missing chat setup; claim a reminder atomically to prevent competing workers posting twice. Exclude cancelled/completed/rescheduled classes. | Live background worker, chat membership, time zone, restart and two-worker tests. |
| 085 | Carry Coordinator's selected duration/start into Student Schedules billing. Require a matching confirmed package before invoicing, including the direct upfront route. Accounts confirms full-period fee and included classes; one upfront invoice, monthly total-class reconciliation, immutable extra-class ledger. Correct new schedule end dates to include the starting month. | **Partial:** full billing/database integration and browser UAT remain. Accounts confirmation is required because only the initial schedule batch exists when billing starts; the code must not infer a full package from that batch. Existing wrong monthly invoices need Accounts review, not automatic conversion. Renewal workflow is not implemented. |
| 086 | Accounts calendar exposes the payment-plan dialog; server and UI lock an invoiced plan. Failed loading is not treated as an empty plan. | Role-specific calendar/notification route UAT. |
| 087 | Validate availability and ownership; normalize UTC date-picker dates; restore dates on edit; return success only after saving. | Real tutor edit/reopen and scheduling tests, including Apply to All and explicit removal. |
| 088 | Match availability for the selected date; account for dated exceptions; ignore stale responses. Backend checks actual-date conflicts when rescheduling. | Date/time-zone, original-class exclusion, and genuine collision tests. |
| 089 | Display Change Tutor when a tutor exists, retaining underlying status values. | Check the actual database-supplied action label in Operations. |
| 091 | Show full chat name, with distinct group/subject label as subtitle. | Multiple student groups with similar subjects and long names. |
| 092 | Await class lookup; resolve the selected class's student/tutor calendar and month; open that event; show lookup errors. | End-to-end postponed/rescheduled save and permissions. Navigation alone does not prove the save workflow. |
| 093 | Ordinary Student List: debounced search, pagination, stale-response protection and permission-aware header search. Coordinator Enrollment History now also has visible search by code/name/parent/email/mobile, using its full authorized list across pages, plus loading/error/retry feedback. Other roles retain their existing search toolbar. | **Partial:** measure Student List API/database loading time; no measured backend performance improvement is claimed. Enrollment History search is local over the existing unpaged authorized result, not a new server-paging implementation. |
| 094 | Repair an existing Chat menu link without granting additional menu permissions. | **Partial:** verify Accounts menu permissions, chat membership, and server response; missing permissions/groups are not repaired by this patch. |
| 096 | Traced screenshot to `sales/UpdateSalesDetailsStatus`, not classroom provisioning. Assignment emails now run in an awaited batch of at most three; database operations stay sequential. Added timing logs and UI failure/duplicate-submit guards. | **Partial:** local regression checks pass; production delay has not been measured. Slow SMTP can still delay this awaited request. No durable email queue or automatic email retry was added. |

## Confirmed package rule

- Recurring No. of Months = the full package duration, not a choice to generate separate monthly tuition invoices. Accounts confirms the full fee and class count before the first invoice. New October three-month schedules end December 31, not January 31. Existing saved schedules are not rewritten.
- A three-month, 24-class package has **one total of 24 classes**, not eight-class monthly limits.
- Ten completed classes in month one incur no extra charge. Fourteen remain.
- Completing the remaining fourteen in month two exhausts the package. Month three has no included entitlement; future classes must not be taken under that package.
- A monthly check creates a zero-value invoice when there are no billable extras. It does not re-invoice the upfront fee.
- Historical completed extras beyond 24 require Accounts approval before invoicing. Each extra class can be charged only once; a later check may create a supplemental invoice for newly approved extras.
- Positive reconciliation invoices are emailed; failed delivery can be retried without creating duplicate charges. Zero-value checks are not emailed.
- Payment settles charges; **it does not add more included classes**. Additional entitlement requires a new approved package.
- Monthly checking is currently an Accounts action/API call, **not an automatic monthly scheduled job**. Renewal UI and external classroom join-access enforcement are not implemented in this patch. These are release limitations, not completed features.
- Cancellation/correction of already invoiced extra attendance requires Accounts review; automatic credit notes/reallocation are not implemented.

## Deployment requirements — after local acceptance

This is **API + UI + database**, not UI-only.

1. Back up the target database and retain the current API/UI releases. Use a non-production database and safe test mailbox first.
2. Confirm the target database name from the API configuration without sharing credentials.
3. Ensure the existing `TCTLMSAPI/TCTDatabase/DDL/Server_Scheduling_Invoice_Release.sql` prerequisites are installed. That script includes payment-plan/payment columns and the reminder marker. It has a database-name guard and can backfill missing academic end dates; review it before rerunning.
4. Set `@ExpectedDatabase` in `TCTLMSAPI/TCTDatabase/DDL/Server_Package_Reconciliation_Release.sql` to the exact target name, then execute the script in that database.
5. New object: **dbo.PrepaidClassCharge**. It has a primary key, three foreign keys (plan, class, invoice), an amount check, a unique class index preventing duplicate billing, and a plan lookup index. No new stored procedure is added by this patch.
6. Review the script's readiness report. Previously invoiced packages lacking a confirmed `TotalClasses` must be checked against their original agreement; do not infer historical entitlement from an expanded current schedule.
7. Deploy the matching API, then UI. Do not deploy the UI against an API without the package-status endpoint/schema. Restart the API so the reminder worker uses the new code.
8. Run the acceptance scenarios below. Stop release if financial totals, duplicate prevention, or entitlement checks fail.

Do not drop the ledger after invoices have been issued. It is financial history and duplicate-billing protection. A rollback after live financial writes requires a reviewed recovery plan, not simply restoring the old billing code.

## Step-by-step local acceptance

Use test users and an isolated database copy. Route outbound email to a safe test mailbox. Keep ordinary future-attendance restrictions enabled; use past class dates for completion tests.

### Package billing — Accounts/AccountsAdmin

1. As Coordinator, create a new regular recurring schedule with No. of Months = 3. For an October start, verify Schedule End Date = December 31. Repeat with one month, ten months, and a year boundary. Existing schedules/invoices must remain unchanged.
2. As Accounts, open Student Schedules and that student's Schedules & Billing dialog. Confirm the subject shows a three-month package and its starting month. Click Generate: an unconfirmed package must open Package Billing rather than silently create a monthly invoice. Confirm the full-period fee and 24 included classes, save, and reopen. The initial month's scheduled count must not be automatically treated as the entire package. Verify a mismatched draft period, missing count, or prior issued monthly invoice blocks upfront generation with a clear message. Existing issued invoices require manual Accounts review. Also test payment-plan access through the student's calendar.
3. Generate the upfront invoice twice. Verify one full-period invoice, no duplicate subject lines, and a printed total matching the saved invoice. Reopen the plan: editing is locked. Direct API edits must also fail.
4. Record the agreed payment using Accounts. Student/Tutor credentials must not be able to record a payment or create an invoice. Verify overpayment is rejected.
5. Record ten genuine completed classes in month one through normal attendance/approval. Run that month's check. Expect zero extra charges, a zero-value reconciliation invoice, and fourteen remaining classes. Repeat: no duplicate invoice or charge.
6. Record fourteen more in month two. Expect zero extra charges and zero remaining classes. Try to create/complete another regular class: expect a clear package-exhausted rejection. Existing historical attendance must remain accessible for other roles' final approval.
7. For an isolated historical-data fixture only, include 25th/26th completed classes. Before Accounts approval, monthly invoicing must fail clearly. After approval, charge only those extras using the agreed rate and duration; do not charge the first 24 again.
8. Repeat the extra-class check, including two concurrent requests. Verify one ledger entry per extra class and no duplicate payable charges. Confirm invoice PDF and email match stored totals.
9. Simulate email failure using a test configuration. Confirm the invoice remains saved, the UI reports delivery failure, and retry resends the same invoice rather than charging again.
10. Record payment of the extra invoice. Confirm the payable balance clears but included classes remain zero. **Do not expect renewal from this payment.** Renewal must be separately designed/tested before additional paid entitlement can be managed end-to-end.
11. Test a student with both prepaid and ordinary monthly subjects: each is invoiced through its correct path without missing or double charging a subject.
12. Test an old issued plan without `TotalClasses`, an expired plan, cancelled classes, demo classes, late attendance corrections, and repeat monthly checks. Resolve discrepancies before release.

### Availability, demo rescheduling, and tutor assignment

1. As Coordinator, edit one tutor's recurring availability, save, reopen, and confirm persisted weekday/start/end dates and times.
2. Add a dated unavailable exception inside a matching student/tutor interval. Confirm only that overlap is removed for that date, not every occurrence of the weekday.
3. Reschedule a demo to a matching date. Change dates rapidly; the last date's response must win. An API error must show an error, not a false 'no common availability'.
4. Confirm the original demo does not block its own replacement, but an unrelated same-date overlapping class does block saving. Repeat with different dates sharing a weekday.
5. Assign regular classes. In Operations, confirm Assign Tutor/Assign Tutor Slots changes to Change Tutor, while unrelated actions and underlying status transitions remain unchanged.
6. For BUG-096, use Coordinator → Tutor List → Assign Tutor with Request for Re-schedule, then Save. Filter Network for `UpdateSalesDetailsStatus`; record duration, status and response (redact tokens/personal details). Compare `TutorAssignment` logs for persistence, notification preparation, email batch, and total save. This screen does not provision a classroom. Verify Coordinator Admin receives the assignment, the tutor receives notification/email, and any changed tutor payment still reaches Super Admin for approval. Double-click Save: one request only. Simulate an unsuccessful API result: keep the dialog open with an error, never show success. Compare pre/post timings on representative data before closing this bug.

### Chats and reminders

1. As AccountsAdmin, use the existing Chat menu. Confirm the correct chat page opens and permitted conversations load. Verify no extra role permissions were granted.
2. Open two groups with similar subjects. Confirm full group/student identity is visible and long names remain identifiable.
3. As Operations, choose Rescheduled/Postponed on a class message. Confirm the correct student, class, and month open; save the requested change and reload to verify persistence. Repeat as Tutor for that tutor's own class; unauthorized Student/Tutor access to another class must fail.
4. Schedule a test class more than two hours ahead with a valid group. Verify no early reminder; on entering the two-hour window, exactly one persisted chat reminder appears for intended members. Repeat after API restart and with concurrent workers.
5. Test missing chat-group setup, cancelled/completed/rescheduled classes, and failed live SignalR delivery. Missing setup must remain retryable; persisted reminders must not duplicate after live-delivery failure.

### Search and regressions

1. Open Student List under Operations, Coordinator, and Accounts roles. Search a name, then rapidly change the term; results must match the final term. Test page two, clearing search, and empty results.
   In Coordinator → Enrolled Student List / Sales → Enrollment History (`/lms/sales/enrollment-history`), test code, student name, parent name, email, mobile and multiple words. Search for a student originally beyond page one; the result must appear. Clear the search to restore the authorized list. Confirm search does not expose another coordinator's students. Simulate a loading failure and use Retry.
2. Test permitted header search and confirm it routes to the appropriate student list. Verify roles without student-list access do not gain it.
3. Record Network timings before/after with representative data; do not close the loading-performance bug without measured results.
4. Retest ordinary monthly invoicing, tutor payroll, demo creation, existing permissions, and all dashboard date filters/Refresh. These workflows must not regress.

## Automated checks run

- API build: passed (existing warnings remain).
- UI production build: passed (existing dependency/bundle warnings remain).
- Application tests: **76 passed**, including availability matching, package counts, selected-period guards, inclusive month boundaries, email batching and assignment-save/approval tests. These are not full database billing tests.
- Nine focused UI suites: **70 passed**, including payment-plan locking/selection/error handling, Enrollment History search, inclusive month boundaries, assignment failures/duplicate submission, workflow links, assessment service and dashboard regressions. Existing test-console warnings remain.
- Isolated SQL Server schema smoke test: passed database guard, deployment/rerun, valid ledger insert, duplicate rejection, negative-amount rejection, all three foreign keys, and final row count. Temporary database removed. It uses minimal parent tables, not a copy of the full LMS schema.
- Full UI suite is not green: pre-existing `App.test.js` cannot parse an ESM dependency from `react-syntax-highlighter`. Focused suite success must not be represented as full-suite success.
- Live browser UAT, real database repository integration, SMTP delivery, and concurrent API billing tests remain to be performed.

Schema test harness: `TCTLMSAPI/TCTDatabase/DDL/Test-PackageReconciliationSchema.ps1`. It requires the dedicated LocalDB instance named in that file and does not accept an existing LMS connection string.
