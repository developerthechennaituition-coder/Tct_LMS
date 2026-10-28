import { scheduledPackageEnd } from "./scheduledPackagePeriod";

test.each([
  ["2026-10-15", 3, "2026-12-31"],
  ["2026-11-01", 3, "2027-01-31"],
  ["2028-02-10", 1, "2028-02-29"],
  ["2026-10-15", 10, "2027-07-31"],
])("%s plus %s package months ends on %s", (start, months, expected) => {
  expect(scheduledPackageEnd(start, months).format("YYYY-MM-DD")).toBe(expected);
});
