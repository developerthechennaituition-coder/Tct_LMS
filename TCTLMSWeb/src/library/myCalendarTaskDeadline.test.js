import moment from "moment";
import { taskDeadline, taskDeadlineState, formatDeadlineDuration, deadlineDetail, DEADLINE_LABELS } from "./myCalendarTasks";

// "Now" as an India (storage timezone) wall-clock time, independent of the machine's timezone.
const ist = (text) => moment.utc(text, "YYYY-MM-DD HH:mm").subtract(330, "minutes");
const task = (dueTime, extra = {}) => ({ dueDate: "2026-11-20T00:00:00", dueTime, status: "Pending", ...extra });
const state = (t, now) => taskDeadlineState(t, ist(now))?.state ?? null;

describe("task deadline state", () => {
  test("deadline is the due time in India time, or the end of the due date for date-only tasks", () => {
    expect(taskDeadline(task("17:00:00")).toISOString()).toBe("2026-11-20T11:30:00.000Z");
    expect(taskDeadline(task(null)).toISOString()).toBe("2026-11-20T18:30:00.000Z");
    expect(taskDeadline({ dueDate: null })).toBeNull();
  });

  test("more than 7 days ahead: no deadline state", () => {
    expect(state(task("17:00:00"), "2026-11-12 23:59")).toBeNull();
  });

  test.each([
    ["2026-11-13 00:00", "dueSoon"], // D-7
    ["2026-11-16 12:00", "dueSoon"],
    ["2026-11-19 23:59", "dueSoon"], // D-1
    ["2026-11-20 00:00", "dueToday"],
    ["2026-11-20 16:59", "dueToday"],
    ["2026-11-20 17:00", "overdue"],
    ["2026-12-20 09:00", "overdue"], // stays overdue until completed
  ])("at %s → %s", (now, expected) => {
    expect(state(task("17:00:00"), now)).toBe(expected);
  });

  test("date-only task is due today until midnight, then overdue", () => {
    expect(state(task(null), "2026-11-20 23:59")).toBe("dueToday");
    expect(state(task(null), "2026-11-21 00:00")).toBe("overdue");
  });

  test.each(["Completed"])("excluded: status %s (also Pending Verification / Verified / Changes Requested)", (status) => {
    expect(taskDeadlineState(task("17:00:00", { status }), ist("2026-11-21 10:00"))).toBeNull();
  });

  test("In Progress (status Pending) keeps its deadline state", () => {
    expect(state(task("17:00:00", { verificationStatus: "InProgress" }), "2026-11-21 10:00")).toBe("overdue");
  });

  test("remaining and elapsed time", () => {
    const soon = taskDeadlineState(task("17:00:00"), ist("2026-11-17 13:00"));
    expect(deadlineDetail(soon)).toBe("Due in 3d 4h");
    expect(deadlineDetail(taskDeadlineState(task("17:00:00"), ist("2026-11-20 11:40")))).toBe("5h 20m left");
    expect(deadlineDetail(taskDeadlineState(task("17:00:00"), ist("2026-11-21 19:00")))).toBe("Overdue by 1d 2h");
  });

  test("durations", () => {
    expect(formatDeadlineDuration(12 * 60000)).toBe("12m");
    expect(formatDeadlineDuration(30000)).toBe("less than a minute");
    expect(formatDeadlineDuration(-5)).toBe("less than a minute");
  });

  test("labels", () => {
    expect(DEADLINE_LABELS).toEqual({ dueSoon: "Due Soon", dueToday: "Critical — Due Today", overdue: "Overdue" });
  });
});
