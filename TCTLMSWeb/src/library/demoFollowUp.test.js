import moment from "moment";
import {
  BASE_D_DAY_OPTIONS, dDayFilterOptions, daysUntilDemo, demoDayMarkerDate, demoDayOffset, demoFollowUpCategory,
  LONG_FOLLOW_UP, SHORT_FOLLOW_UP, upcomingDemoDays,
} from "./demoFollowUp";

const today = moment("2026-10-01T18:30:00");
const demoIn = (days, time = "09:00:00") => `${moment("2026-10-01").add(days, "days").format("YYYY-MM-DD")}T${time}`;

test.each([
  [1, SHORT_FOLLOW_UP],
  [3, SHORT_FOLLOW_UP],
  [7, SHORT_FOLLOW_UP],
  [10, SHORT_FOLLOW_UP],
  [14, SHORT_FOLLOW_UP],
  [15, LONG_FOLLOW_UP],
  [20, LONG_FOLLOW_UP],
  [29, LONG_FOLLOW_UP],
  [30, LONG_FOLLOW_UP],
  [31, null],
  [0, null],
  [-1, null],
])("demo %s day(s) away → %s", (days, expected) => {
  expect(demoFollowUpCategory(demoIn(days), 20019, today)).toBe(expected);
});

test("missing or invalid Actual Demo Date has no category", () => {
  expect(demoFollowUpCategory(null, 20019, today)).toBeNull();
  expect(demoFollowUpCategory("not a date", 20019, today)).toBeNull();
});

test("Long Follow-up becomes Short Follow-up once the demo is 14 days away", () => {
  const demo = "2026-10-20T10:00:00";
  expect(demoFollowUpCategory(demo, 20006, moment("2026-10-01T09:00:00"))).toBe(LONG_FOLLOW_UP);
  expect(demoFollowUpCategory(demo, 20006, moment("2026-10-05T23:59:00"))).toBe(LONG_FOLLOW_UP);
  expect(demoFollowUpCategory(demo, 20006, moment("2026-10-06T00:01:00"))).toBe(SHORT_FOLLOW_UP);
});

test("calendar days are counted across month and year boundaries, ignoring time of day", () => {
  expect(daysUntilDemo("2026-11-01T00:15:00", moment("2026-10-31T23:45:00"))).toBe(1);
  expect(daysUntilDemo("2027-01-14T07:00:00", moment("2026-12-31T22:00:00"))).toBe(14);
  expect(demoFollowUpCategory("2027-01-30T07:00:00", 20019, moment("2026-12-31T08:00:00"))).toBe(LONG_FOLLOW_UP);
});

test.each([20004, 20018, 20027, 20031, 20041, 20046, 20047, 20048])(
  "excluded enrolment status %s gets no category",
  (code) => {
    expect(demoFollowUpCategory(demoIn(5), code, today)).toBeNull();
  }
);

test("demos without an enrolment status still get a category", () => {
  expect(demoFollowUpCategory(demoIn(5), null, today)).toBe(SHORT_FOLLOW_UP);
});

test.each([
  [7, 7], [6, 6], [5, 5], [4, 4], [3, 3], [2, 2], [1, 1],
  [8, null], [14, null], [0, null], [-1, null], [-7, null],
])("demo %s day(s) away → D-day %s", (days, expected) => {
  expect(demoDayOffset(demoIn(days), 20019, today)).toBe(expected);
});

test("D-day counts down day by day and across month / year boundaries", () => {
  const demo = "2026-11-03T08:00:00";
  expect(demoDayOffset(demo, 20019, moment("2026-10-27T23:00:00"))).toBe(7);
  expect(demoDayOffset(demo, 20019, moment("2026-10-31T06:00:00"))).toBe(3);
  expect(demoDayOffset(demo, 20019, moment("2026-11-02T22:30:00"))).toBe(1);
  expect(demoDayOffset(demo, 20019, moment("2026-11-03T07:00:00"))).toBeNull();
  expect(demoDayOffset("2027-01-02T09:00:00", 20019, moment("2026-12-30T20:00:00"))).toBe(3);
});

test("D-day uses the same exclusions as the follow-up categories", () => {
  [20004, 20018, 20027, 20031, 20041, 20046, 20047, 20048].forEach((code) =>
    expect(demoDayOffset(demoIn(3), code, today)).toBeNull()
  );
  expect(demoDayOffset(demoIn(3), null, today)).toBe(3);
  expect(demoDayOffset(null, 20019, today)).toBeNull();
});

// ── Demo Calendar D-N markers (D-1 … D-N) ────────────────────────────────────
const cal = moment("2026-10-23T18:30:00");

test.each([
  ["2026-10-24T09:00:00", 1], ["2026-10-25T09:00:00", 2], ["2026-10-26T09:00:00", 3],
  ["2026-11-02T09:00:00", 10], ["2026-12-22T09:00:00", 60],
  ["2026-10-23T23:00:00", null], ["2026-10-22T09:00:00", null],
])("upcomingDemoDays(%s) → %s", (demoStart, expected) => {
  expect(upcomingDemoDays(demoStart, 20019, cal)).toBe(expected);
});

test("today's D-N marker is exactly the demos N days from today", () => {
  [1, 2, 3, 5, 7, 10].forEach((n) => {
    const demo = moment("2026-10-23").add(n, "days").format("YYYY-MM-DD") + "T09:00:00";
    expect(demoDayMarkerDate(demo, 20019, n, cal)).toBe("2026-10-23");
    expect(demoDayMarkerDate(demo, 20019, n + 1, cal)).toBeNull(); // would fall before today
  });
});

test("an upcoming demo also gets later D-N markers N days before it", () => {
  // Demo on 30 Oct (7 days away): D-1 on 29 Oct, D-3 on 27 Oct, D-7 today; D-8 none.
  expect(demoDayMarkerDate("2026-10-30T00:00:00", 20019, 1, cal)).toBe("2026-10-29");
  expect(demoDayMarkerDate("2026-10-30T00:00:00", 20019, 3, cal)).toBe("2026-10-27");
  expect(demoDayMarkerDate("2026-10-30T00:00:00", 20019, 7, cal)).toBe("2026-10-23");
  expect(demoDayMarkerDate("2026-10-30T00:00:00", 20019, 8, cal)).toBeNull();
});

test("no marker for past, today, excluded statuses or invalid offsets", () => {
  expect(demoDayMarkerDate("2026-10-14T09:00:00", 20006, 1, cal)).toBeNull(); // past
  expect(demoDayMarkerDate("2026-10-23T20:00:00", 20019, 1, cal)).toBeNull(); // today
  [20004, 20018, 20027, 20031, 20041, 20046, 20047, 20048].forEach((code) =>
    expect(demoDayMarkerDate("2026-10-25T09:00:00", code, 1, cal)).toBeNull()
  );
  expect(demoDayMarkerDate("2026-10-25T09:00:00", 20019, 0, cal)).toBeNull();
  expect(demoDayMarkerDate("2026-10-25T09:00:00", 20019, "abc", cal)).toBeNull();
  expect(demoDayMarkerDate(null, 20019, 1, cal)).toBeNull();
});

test("D-N markers cross month-end, year-end and leap day (calendar days, time ignored)", () => {
  expect(demoDayMarkerDate("2026-11-01T00:30:00", 20019, 1, moment("2026-10-31T23:30:00"))).toBe("2026-10-31");
  expect(demoDayMarkerDate("2027-01-02T07:00:00", 20019, 2, moment("2026-12-31T10:00:00"))).toBe("2026-12-31");
  expect(demoDayMarkerDate("2028-03-01T07:00:00", 20019, 2, moment("2028-02-20T10:00:00"))).toBe("2028-02-28");
  expect(demoDayMarkerDate("2028-03-01T07:00:00", 20019, 1, moment("2028-02-20T10:00:00"))).toBe("2028-02-29");
});

test("D-day options keep D-1 … D-7 and add D-8+ only for eligible upcoming demos", () => {
  expect(BASE_D_DAY_OPTIONS).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(dDayFilterOptions([], "", cal)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  const demos = [
    { demoStart: "2026-10-30T00:00:00", statusCode: 20019 }, // 7 → already listed
    { demoStart: "2026-11-02T09:00:00", statusCode: 20013 }, // 10
    { demoStart: "2026-11-02T09:00:00", statusCode: 20013 }, // same day twice → once
    { demoStart: "2026-11-05T09:00:00", statusCode: 20041 }, // completed → no option
    { demoStart: "2026-10-14T09:00:00", statusCode: 20006 }, // past → no option
  ];
  expect(dDayFilterOptions(demos, "", cal)).toEqual([1, 2, 3, 4, 5, 6, 7, 10]);
  // The selected value always stays available.
  expect(dDayFilterOptions([], "12", cal)).toEqual([1, 2, 3, 4, 5, 6, 7, 12]);
});

test("existing D-1 … D-7 helper is unchanged", () => {
  expect(demoDayOffset("2026-10-30T00:00:00", 20019, cal)).toBe(7);
  expect(demoDayOffset("2026-11-02T09:00:00", 20019, cal)).toBeNull();
});

test("eligible demos 8 and 10 days away get D-8 / D-10 markers and options", () => {
  const in8 = "2026-10-31T10:00:00";
  const in10 = "2026-11-02T10:00:00";
  expect(demoDayMarkerDate(in8, 20019, 8, cal)).toBe("2026-10-23");
  expect(demoDayMarkerDate(in10, 20019, 10, cal)).toBe("2026-10-23");
  expect(demoDayMarkerDate(in10, 20019, 8, cal)).toBe("2026-10-25");
  expect(demoDayMarkerDate(in10, 20031, 10, cal)).toBeNull(); // DC Dropped → excluded
  const options = dDayFilterOptions([{ demoStart: in8, statusCode: 20019 }, { demoStart: in10, statusCode: 20013 }], "", cal);
  expect(options.slice(0, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(options).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 10]);
});

// ── D-day filter: exact (not cumulative) matching for D-1 … D-7 ──────────────
test.each([1, 2, 3, 4, 5, 6, 7])("D-%s marks only the demos exactly that many days after each marker date", (n) => {
  const now = moment("2026-10-23T10:00:00");
  // One eligible demo 1…8 days away, plus a past demo and a dropped one.
  const demos = [1, 2, 3, 4, 5, 6, 7, 8].map((days) => ({
    id: `in${days}`, demoStart: moment("2026-10-23").add(days, "days").format("YYYY-MM-DD") + "T10:00:00", statusCode: 20019,
  })).concat([
    { id: "past", demoStart: "2026-10-20T10:00:00", statusCode: 20019 },
    { id: "dropped", demoStart: "2026-10-30T10:00:00", statusCode: 20031 },
  ]);
  const markers = demos
    .map((d) => ({ id: d.id, at: demoDayMarkerDate(d.demoStart, d.statusCode, n, now), demo: d.demoStart.slice(0, 10) }))
    .filter((m) => m.at !== null);
  // Every marker sits exactly N days before its own demo date.
  markers.forEach((m) => expect(moment(m.demo).diff(moment(m.at), "days")).toBe(n));
  // On today's date D-N shows exactly one demo: the one N days away (never the others).
  expect(markers.filter((m) => m.at === "2026-10-23").map((m) => m.id)).toEqual([`in${n}`]);
  // Demos closer than N days would need a past marker date, so they get none (today-or-later rule).
  for (let closer = 1; closer < n; closer += 1) expect(markers.find((m) => m.id === `in${closer}`)).toBeUndefined();
  expect(markers.find((m) => m.id === "past" || m.id === "dropped")).toBeUndefined();
});

test("example from the requirement: demo on 30 Oct, seen on 23 Oct", () => {
  const now = moment("2026-10-23T09:00:00");
  const expected = { 1: "2026-10-29", 2: "2026-10-28", 3: "2026-10-27", 4: "2026-10-26", 5: "2026-10-25", 6: "2026-10-24", 7: "2026-10-23" };
  Object.entries(expected).forEach(([n, date]) => expect(demoDayMarkerDate("2026-10-30T00:00:00", 20019, Number(n), now)).toBe(date));
});

test("All D-Day Filters (no offset) creates no D-day markers", () => {
  expect(demoDayMarkerDate("2026-10-30T00:00:00", 20019, 0, moment("2026-10-23T09:00:00"))).toBeNull();
  expect(demoDayMarkerDate("2026-10-30T00:00:00", 20019, "", moment("2026-10-23T09:00:00"))).toBeNull();
});
