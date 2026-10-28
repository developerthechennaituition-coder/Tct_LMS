# Dashboard date filters and Refresh

## Release scope

UI-only change. No database script or API deployment is required. Deploy the rebuilt TCTLMSWeb UI after acceptance testing; nothing has been deployed by this change.

- Operations / OperationsAdmin, Coordinator / CoordinatorAdmin, Admin / SuperAdmin / SalesAdmin, Accounts / AccountsAdmin / PayrollAdmin and HR use one shared date-range control.
- Dates display as DD-MM-YYYY and are sent as YYYY-MM-DD without converting calendar dates to UTC.
- Calendar navigation and draft date edits no longer trigger network requests. Refresh validates and applies both dates together, even when the dates have not changed.
- Date controls stay mounted during loading, Refresh is disabled while busy, and errors allow retry.
- Dashboard calendar popups retain Popper's calculated position. The theme's legacy fixed transforms exclude dashboard popups (both bottom and top placements), so they no longer open at the left edge of the dashboard. Other date pickers keep their existing styles.
- Student and Tutor dashboards retain their existing report scope (no new date filters) and refresh without reloading the whole page.
- Existing Operations semantics are preserved: mismatch/cancellation/trend reports use the range; daily planned/rescheduled classes use To date; D-1 reports use the preceding calendar day. Active-profile totals are not date-range totals. Planned and rescheduled cards now identify their report date.

## Manual acceptance tests

Repeat steps 1–7 using each date-filter dashboard listed above:

1. Open the dashboard. Confirm the date controls and a loading indicator appear, then Refresh becomes enabled.
2. Open From date. Confirm the popup is anchored beside/below that input, not under the dashboard heading. Click previous month several times, then next month. Repeat for To date. Cross December/January. The picker must stay open and no dashboard reload should occur until a date is applied. Scroll and resize the window; if there is insufficient space below, a popup above the field is expected, but it must remain anchored to the field.
3. Select or type 30-08-2026 and 30-10-2026. Before Refresh, confirm no date-filter request is sent. Click Refresh and inspect the dashboard requests: fromDate=2026-08-30 and toDate=2026-10-30, where those endpoints support ranges.
4. Click Refresh again without changing dates. Confirm another set of dashboard requests is made and data is reloaded. Use network throttling to confirm Refresh is disabled during the request and the controls do not disappear.
5. Clear a date, enter 31-02-2026, or put From after To. Confirm a useful validation message and no request. Correct the range and retry. Equal From/To must be allowed.
6. Using a controlled test environment, make one request fail. Confirm the error is visible, the dates remain, and Refresh retries successfully after recovery.
7. Confirm the displayed values match the API responses. An unchanged count is not a failed refresh; not every card is date-filtered.

Additional checks:

- Operations: with To date=01-10-2026, D-1 requests and labels must use 30-09-2026, not 29-09-2026. Repeat at January 1 and March 1 in a leap year.
- Student and Tutor: use the header Refresh, confirm data requests repeat without a browser page reload. Verify the existing feedback modal still behaves normally.
- Test in current Chrome and Edge, narrow/mobile width, and both India and a timezone west of UTC. Calendar popovers should remain visible and selected dates must not shift.

## Automated checks

From TCTLMSWeb:

```powershell
$env:CI='true'
$env:TZ='Asia/Calcutta'
npm test -- --watchAll=false --runInBand --runTestsByPath src/pages/lms/dashboard/DashboardDateRange.test.jsx src/pages/lms/dashboard/DashboardRefresh.test.jsx src/apiservices/DashboardService.test.js
npm run build
```

The 28 dashboard tests exercise the real date-picker component, dashboard refresh wiring with mocked services, and query-date construction with mocked HTTP. They do not verify live account permissions, database data, or pixel-level browser layout; perform the manual checks before production release.
