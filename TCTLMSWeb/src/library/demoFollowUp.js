import moment from "moment";

// Follow-up category of an upcoming demo, worked out from the days left until its Actual Demo Date
// (the scheduled demo class). It is only displayed: the enrolment's saved status and its history
// (set manually from My Calendar) are never changed by it.
export const SHORT_FOLLOW_UP = "DP Short Follow-up";
export const LONG_FOLLOW_UP = "DP Long Follow-up";

// Enrolment statuses whose demo is already finished, dropped, cancelled or converted to classes:
// Class Scheduled, DC Need To Schedule, Demo Completed FeedBack Pending, DC Dropped, Demo Completed,
// Demo Cancelled Tutor / Parent Not Available, No-Demo Taken/Sales Follow-up.
export const FOLLOW_UP_EXCLUDED_STATUS_CODES = [20004, 20018, 20027, 20031, 20041, 20046, 20047, 20048];

// Calendar days from today to the demo date (time of day ignored); null when the date is missing.
export const daysUntilDemo = (demoStart, today = moment()) => {
  if (!demoStart) return null;
  const demo = moment(demoStart);
  if (!demo.isValid()) return null;
  // Compare the two calendar dates as UTC days, so time zones and clock changes cannot shift a day.
  return moment.utc(demo.format("YYYY-MM-DD")).diff(moment.utc(moment(today).format("YYYY-MM-DD")), "days");
};

const isExcludedStatus = (enrollmentStatusCode) =>
  enrollmentStatusCode !== null && enrollmentStatusCode !== undefined &&
  FOLLOW_UP_EXCLUDED_STATUS_CODES.includes(Number(enrollmentStatusCode));

// D-day indicator: D-7 … D-1 = calendar days left until the Actual Demo Date, for the same eligible
// demos as the follow-up categories. Today, past, more than 7 days away, missing or excluded → null.
export const MAX_DEMO_D_DAY = 7;
export const demoDayOffset = (demoStart, enrollmentStatusCode, today = moment()) => {
  if (isExcludedStatus(enrollmentStatusCode)) return null;
  const days = daysUntilDemo(demoStart, today);
  return days !== null && days >= 1 && days <= MAX_DEMO_D_DAY ? days : null;
};

// Calendar days to an upcoming demo whose status is not excluded (completed, dropped, cancelled …);
// today, past, missing or excluded → null. No upper limit.
export const upcomingDemoDays = (demoStart, enrollmentStatusCode, today = moment()) => {
  if (isExcludedStatus(enrollmentStatusCode)) return null;
  const days = daysUntilDemo(demoStart, today);
  return days !== null && days >= 1 ? days : null;
};

// Demo Calendar D-N marker: shown on the demo date minus N calendar days, for an eligible upcoming demo
// that is at least N days away (so the marker is on today or later). Returns "YYYY-MM-DD" or null.
// On today's date, D-N therefore marks exactly the eligible demos N days from today.
export const demoDayMarkerDate = (demoStart, enrollmentStatusCode, offset, today = moment()) => {
  const n = Number(offset);
  const days = upcomingDemoDays(demoStart, enrollmentStatusCode, today);
  if (days === null || !Number.isInteger(n) || n < 1 || days < n) return null;
  return moment(moment(demoStart).format("YYYY-MM-DD"), "YYYY-MM-DD").subtract(n, "days").format("YYYY-MM-DD");
};

// Demo Date Reminder options: D-1 … D-7 always, plus D-8 … D-N when an eligible upcoming demo is that
// far away (and the currently selected value, so it never disappears). Each item needs demoStart and
// statusCode (the enrolment status code).
export const BASE_D_DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
export const dDayFilterOptions = (demos, selected, today = moment()) => {
  const options = new Set(BASE_D_DAY_OPTIONS);
  (Array.isArray(demos) ? demos : []).forEach((d) => {
    const days = upcomingDemoDays(d?.demoStart, d?.statusCode, today);
    if (days !== null) options.add(days);
  });
  const chosen = Number(selected);
  if (Number.isInteger(chosen) && chosen >= 1) options.add(chosen);
  return [...options].sort((a, b) => a - b);
};

// 1-14 days → Short, 15-30 days → Long; otherwise (today, past, > 30 days, missing, excluded) none.
export const demoFollowUpCategory = (demoStart, enrollmentStatusCode, today = moment()) => {
  if (isExcludedStatus(enrollmentStatusCode)) return null;
  const days = daysUntilDemo(demoStart, today);
  if (days === null) return null;
  if (days >= 1 && days <= 14) return SHORT_FOLLOW_UP;
  if (days >= 15 && days <= 30) return LONG_FOLLOW_UP;
  return null;
};
