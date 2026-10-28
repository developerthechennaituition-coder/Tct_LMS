# Assessments — deployment and step-by-step acceptance tests

## Scope and verification

This release completes the existing document-based assessment flow: schedule a test from an active class allocation, upload question papers, allow the assigned student to download during the exam window, submit answer sheets, and let the assigned tutor mark them and provide feedback.

It does not change Chat, attendance, invoicing or payroll. It is not an online multiple-choice exam engine.

Checks completed on 5 October 2026:

- API build: passed (existing project/dependency warnings remain).
- UI production build: passed (existing Browserslist and bundle-size warnings remain).
- Dedicated backend assessment tests: 37 passed.
- Frontend assessment API-client/file-validation tests: 12 passed.
- SQL release script, real browser/account workflow, storage permissions and actual email delivery: must be checked using the steps below. No database script was executed and nothing was deployed by the coding agent.

## Rules used in this release

- Operations, OperationsAdmin, Admin and SuperAdmin can schedule, cancel future assessments, upload/replace papers and inspect assessment files.
- Tutors can do these actions only for their own active student/subject allocations and assigned assessments. Only the assigned tutor can evaluate an answer sheet.
- Students see and submit only their own assessments. Identity and permissions are checked on the server; changing browser storage, query-string IDs or form IDs does not grant access.
- All exam dates/times are IST (UTC+05:30), regardless of the server/browser timezone.
- Paper download opens at the exam start and closes at the exact end. Staff/assigned tutors may preview their papers outside the student window.
- A question paper can be uploaded/replaced only before the test starts. The one-day advance target is a warning, not a hard block on a late upload before the start.
- Answer sheets are accepted from the start onwards, including after the exam ends. A late submission is clearly labelled. This is the provisional default pending confirmation of the business policy.
- One submission per student per test. Submitted or evaluated answers cannot silently be replaced. Include every page before submitting.
- Up to 10 PDF/DOC/DOCX/JPG/JPEG/PNG files per upload; maximum 20 MB each and 40 MB total. Empty files are rejected. A single file stays in its original format; multiple files are downloaded as a ZIP containing all files.
- The evaluation target is one day after submission. Due/overdue badges are shown; overdue work is still allowed to be marked. This release does not introduce a recurring reminder/escalation service.
- Submission/evaluation notifications use the existing notification/email system. If notification delivery fails, saved academic work remains saved and the failure is logged. There is no new automatic email retry/outbox in this release.

## 1. Prepare the local/test environment

1. Back up the intended LMS database. Confirm the API's connection points to the local/test database, not production. Do not paste connection strings or access tokens into the test log.
2. In SSMS select that database and run `TCTLMSAPI/TCTDatabase/DDL/server_assessment_release.sql`.
3. Confirm the result says `Assessment schema ready` and the database name is correct.
4. The script creates `TestSchedule` and `AnswerSheetSubmission` if missing, and adds uniqueness/marks/duration safeguards. It uses the existing `Document` and `DocumentStorage` tables; it does not recreate them.
5. If the script reports duplicate active rows, missing/invalid start times, or invalid existing data, stop and review the records. Start times must be `HH:mm` (IST). Do not delete or deactivate real records just to make deployment pass. The script intentionally does not do that automatically.
6. Ensure the API process has read/write permission under `<API content root>/FileStorage/Assessment`. Preserve/back up this folder during deployments; never clear it when replacing binaries. Existing stored absolute file paths must remain valid when moving servers.
7. For IIS, configure the site's request-size limit to allow 45 MB if you need the full 40 MB upload payload plus multipart overhead. Application endpoints allow 45 MB. Apply this to the appropriate API site, not unrelated sites.
8. Confirm the existing SMTP/notification configuration is working. Use dedicated test accounts/email recipients; test submissions generate real messages if mail is enabled.
9. Restart the API and UI together. Do not deploy only the UI: the new scheduling and authenticated-download APIs are required.

## 2. Prepare accounts and sample files

Use separate browser profiles/private sessions to avoid mixing roles:

- O: OperationsAdmin (also repeat key checks using Operations).
- T1: the assigned Tutor.
- S1: the assigned Student.
- T2: an unrelated Tutor.
- S2: an unrelated Student.

Ensure S1 has an active class allocation for a subject with T1. This means active schedule, student, tutor and linked user records. Prepare `question.pdf`, `answer-page1.pdf` and `answer-page2.png`. Never use real student ID documents as samples.

## 3. Entry points

With the local UI on port 8902:

- Tutor/Operations dashboard → Upload Question Papers → `http://localhost:8902/lms/assessment/question-paper-upload`
- Student dashboard → My Tests & Assessments → `http://localhost:8902/lms/assessment/my-tests`
- Tutor dashboard → Evaluate Answer Sheets → `http://localhost:8902/lms/assessment/answer-sheet-evaluation`

The existing dashboard links remain available. Administrators may use the first direct route. An unauthorized role may reach a page shell, but its data/actions must be denied by the API.

## 4. Main flow — schedule, upload, submit, evaluate

### A01 — Schedule an assessment (OperationsAdmin)

1. Log in as O and open Upload Question Papers.
2. Click **Schedule Test**.
3. Select S1 / the subject / T1 from the allocation list.
4. For a quick smoke test, choose today's date, a start 5–10 minutes in the future (IST), and a duration of 2 minutes. Leave enough time to upload before the start.
5. Click **Schedule Test** once.
6. Expected: success message; one row with the correct student, tutor, subject, date/time and duration. No manual database insert is needed.
7. Try to create the exact same student/tutor/subject/date/start again.
8. Expected: duplicate rejected (HTTP 409); still one active assessment.

### A02 — Upload the question paper (assigned Tutor)

1. Log in as T1 and open Upload Question Papers.
2. Confirm the new test appears and its tutor/student details are correct.
3. Click **Upload**, attach `question.pdf`, enter instructions, and upload.
4. Expected: upload succeeds; for the near-term smoke test the row shows **Uploaded Late** because it is less than one day before the exam.
5. Click **Download** as T1. Confirm the file opens correctly.
6. Before the start, click **Replace**; confirm saved instructions are present. Upload a revised paper.
7. Expected: the latest paper is downloaded; prior stored files are retained for history, not overwritten.
8. After the test starts, upload/replace must be disabled in the UI and refused by the API.

### A03 — Student paper availability

1. Before the start, log in as S1 and open My Tests & Assessments.
2. Expected: correct subject, IST time, instructions and duration; paper is locked; answer submission is not yet available.
3. Keep the page open until the start.
4. Expected: paper download and answer submission become available without needing to log in again.
5. Download the question paper. Confirm it is the latest version and the download uses an authenticated request.
6. At/after the end, expected: **Test window closed**; the paper-download action is unavailable and a direct API download is also refused.

### A04 — Submit all answer-sheet pages

1. During the window, as S1 click **Submit Answer Sheet**.
2. Select both `answer-page1.pdf` and `answer-page2.png`.
3. Check both filenames, then submit once.
4. Expected: **Pending Evaluation**, no second submission button, and **My Answer Sheet** is available.
5. Download My Answer Sheet and extract the ZIP.
6. Expected: both original pages are present and readable, numbered to avoid duplicate filename collisions.
7. Refresh the page and confirm the same submission remains.
8. Confirm T1 receives an in-app notification and email. If email fails, verify the saved submission remains and review the API log's assessment-notification error.

### A05 — Evaluate and preserve feedback

1. As T1 open Evaluate Answer Sheets; leave search blank initially.
2. Expected: the submission loads without a 400 error. Subject/student, submission time, deadline and status are correct.
3. Download the answer sheet; confirm every page is included.
4. Click **Evaluate** and enter marks `80`, maximum `100`, feedback `Good work; revise question 3`.
5. Save. Expected: Evaluated status and `80 / 100`.
6. Reopen **View / Edit**. Expected: marks AND the previous feedback are pre-filled.
7. Change marks to `85` without editing feedback and save.
8. Expected: feedback is retained; S1 receives the evaluation notification/email.
9. As S1 click **Refresh Tests / Results**. Expected: `85 / 100` and the full saved feedback.

## 5. Edge cases and security

### A06 — Late submission

1. Create a separate short assessment and upload its paper before the start.
2. Do not submit until after its end.
3. Submit as S1.
4. Expected: submission succeeds with **Late submission** in the student view and **Late** in the tutor list; no paper download is available after the end.

### A07 — Missing/invalid files

1. Try upload without a file, a zero-byte PDF, an EXE, a file over 20 MB, over 10 files, or a total over 40 MB.
2. Expected: clear validation error; no successful-upload message and no saved submission.
3. Verify a valid single PDF is downloaded as PDF, not ZIP; multiple valid files download as ZIP.

### A08 — Unauthorized student/tutor

1. As S2 open My Tests & Assessments; S1's test must not appear.
2. As T2 open upload/evaluation pages; T1's assessments/submissions must not appear.
3. In a controlled test, call S1's paper/answer download with S2's own session, and try upload/evaluation with T2's own session.
4. Expected: HTTP 403 (or 404 for nonexistent records), no file contents, and no data changes.
5. Change a `studentId`, `UploadedByUserId`, `EvaluatedByUserId`, `userId` or `roleId` in a test request.
6. Expected: access is still checked against the signed-in user; spoofed author IDs are ignored and audit fields record the real caller.
7. Repeat a download without authentication. Expected: HTTP 401, not an exam paper.

### A09 — Duplicate submission/double-click

1. Submit an answer, then repeat the request (or submit from a second tab).
2. Expected: HTTP 409 and only one active submission. An existing evaluation/feedback must not be reset.
3. Confirm the release script's unique submission index is present. This is needed for concurrent requests, not just sequential checks.

### A10 — Invalid marks and missing records

1. Try negative marks, marks above maximum, maximum zero, and more than two decimal places.
2. Expected: rejected by the server even if browser validation is bypassed; original evaluation remains unchanged.
3. Use a nonexistent test/submission ID in an upload/evaluation request.
4. Expected: HTTP 404, not a false success.

### A11 — Cancel an incorrectly scheduled test

1. As O or the assigned tutor, create a future assessment then click **Cancel** and confirm.
2. Expected: it disappears from active student/staff lists; files/records are not physically deleted.
3. Correct the details by scheduling a new test.
4. Try cancellation after the start. Expected: HTTP 409; no cancellation.

### A12 — Deadline labels

1. Schedule a test more than 24 hours ahead and upload immediately. Expected: **Uploaded**.
2. Schedule another test less than 24 hours ahead and upload before it starts. Expected: **Uploaded Late**.
3. For an existing pending submission older than one day in a dedicated test dataset, open evaluation. Expected: **Overdue** and evaluation still allowed.
4. Do not change production timestamps to simulate overdue records.

### A13 — Timezone and session handling

1. View the same assessment from browsers/devices with different timezones.
2. Expected: both display the same explicitly labelled IST time and open/close based on the server-defined instant.
3. Log out as S1, log in as S2, and open My Tests directly without first visiting the dashboard.
4. Expected: S2's tests only; no dependency on a stale `studentId` in browser storage.

### A14 — Controlled storage/database/mail failures

1. Only in an isolated test environment, make the assessment storage folder unwritable, then upload.
2. Expected: failure; no success message or completed submission without a file. Restore permissions afterwards.
3. Simulate a database failure during document metadata save in automated tests. Expected: transaction rollback and removal of only the newly created physical file.
4. Simulate notification failure. Expected: saved academic work remains saved; the API logs the notification failure. This release does not automatically retry failed emails.

### A15 — Regression and deployment gate

1. Confirm normal class calendars, attendance updates, invoices, payslips and Chat still open as before.
2. Confirm no assessment entry is created just by scheduling a normal lesson; assessments are created explicitly through Schedule Test.
3. Re-run the release script on the test database. Expected: no duplicate objects or lost data.
4. Record actual versus expected results for A01–A15, including email delivery and downloads.
5. Only after local/test sign-off, deploy the database script, API and UI together. Retain the assessment file-storage folder.

## Developer regression commands

From `TCTLMSAPI`:

```powershell
dotnet build TCT.LMS.API/TCT.LMS.API.csproj --no-restore
dotnet test TCT.Assessment.Tests/TCT.Assessment.Tests.csproj
```

From `TCTLMSWeb`:

```powershell
npm run build
$env:CI='true'
npm test -- --watchAll=false --runInBand --runTestsByPath src/apiservices/AssessmentService.test.js
```

The dedicated assessment test project is separate from the legacy test project and uses fake repositories plus isolated temporary files. Those checks do not prove live SQL transaction/index behavior, live HTTP authorization middleware, SMTP delivery, or browser download rendering; the acceptance scenarios cover those remaining integration checks.
