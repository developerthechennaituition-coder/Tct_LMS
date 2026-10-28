import moment from "moment";
import { criticalTaskOffset, groupCriticalTasks, myTaskDemoOffset, MY_TASK_STATUS_CODES, selectMyTaskDemos } from "./myCalendarTasks";

const today = moment("2026-10-23T18:30:00");

// ── My Task: upcoming demos 1-3 days ahead ───────────────────────────────────
test.each([
  ["2026-10-24T09:00:00", 1],
  ["2026-10-25T23:30:00", 2],
  ["2026-10-26T00:15:00", 3],
  ["2026-10-23T23:00:00", null], // today (D-Day)
  ["2026-10-27T10:00:00", null], // D-4
  ["2026-10-22T10:00:00", null], // yesterday
  ["2026-10-20T10:00:00", null], // 3 days ago
])("demo on %s → My Task D-%s", (demoStart, expected) => {
  expect(myTaskDemoOffset(demoStart, 20007, today)).toBe(expected);
});

test.each(MY_TASK_STATUS_CODES)("eligible status %s is shown", (code) => {
  expect(myTaskDemoOffset("2026-10-24T09:00:00", code, today)).toBe(1);
});

// Demo Cancelled, Class Scheduled, DC Need to schedule, Demo Completed Feedback Pending,
// DC Dropped, Demo Completed, No-Demo Taken, legacy ShortFollowUp, DP Parent Followup.
test.each([20015, 20004, 20018, 20027, 20031, 20041, 20048, 20008, 20010])(
  "status %s is not shown",
  (code) => {
    expect(myTaskDemoOffset("2026-10-24T09:00:00", code, today)).toBeNull();
  }
);

test("missing status or date is not shown", () => {
  expect(myTaskDemoOffset("2026-10-24T09:00:00", null, today)).toBeNull();
  expect(myTaskDemoOffset(null, 20007, today)).toBeNull();
  expect(myTaskDemoOffset("not a date", 20007, today)).toBeNull();
});

test("My Task window crosses month-end and year-end, ignoring time of day", () => {
  expect(myTaskDemoOffset("2026-11-02T08:00:00", 20006, moment("2026-10-30T23:50:00"))).toBe(3);
  expect(myTaskDemoOffset("2026-11-01T00:05:00", 20006, moment("2026-10-31T23:55:00"))).toBe(1);
  expect(myTaskDemoOffset("2027-01-01T07:00:00", 20009, moment("2026-12-31T22:00:00"))).toBe(1);
  expect(myTaskDemoOffset("2027-01-03T07:00:00", 20009, moment("2026-12-31T01:00:00"))).toBe(3);
  expect(myTaskDemoOffset("2027-01-04T07:00:00", 20009, moment("2026-12-31T23:59:00"))).toBeNull();
});

test("the window moves on by itself each day", () => {
  const demo = "2026-10-26T10:00:00";
  expect(myTaskDemoOffset(demo, 20001, moment("2026-10-22T09:00:00"))).toBeNull(); // D-4
  expect(myTaskDemoOffset(demo, 20001, moment("2026-10-23T09:00:00"))).toBe(3);
  expect(myTaskDemoOffset(demo, 20001, moment("2026-10-25T09:00:00"))).toBe(1);
  expect(myTaskDemoOffset(demo, 20001, moment("2026-10-26T09:00:00"))).toBeNull(); // D-Day
});

test("selectMyTaskDemos lists each session once, eligible only, soonest first; its length is the badge count", () => {
  const row = (id, startTime, enrollmentStatusCode) => ({ scheduleDetailsId: id, startTime, enrollmentStatusCode });
  const rows = [
    row("a", "2026-10-26T09:00:00", 20009), // D-3
    row("b", "2026-10-24T11:00:00", 20013), // D-1
    row("b", "2026-10-24T11:00:00", 20013), // same session loaded from two months
    row("c", "2026-10-25T09:00:00", 20031), // DC Dropped → excluded
    row("d", "2026-10-23T20:00:00", 20007), // today → excluded
    row("e", "2026-10-27T09:00:00", 20007), // D-4 → excluded
    row("f", "2026-10-24T08:00:00", 20046), // D-1, earlier time
  ];
  const list = selectMyTaskDemos(rows, today);
  expect(list.map((d) => d.scheduleDetailsId)).toEqual(["f", "b", "a"]);
  expect(list.map((d) => d.dDay)).toEqual([1, 1, 3]);
  expect(list).toHaveLength(3);
  expect(selectMyTaskDemos([], today)).toHaveLength(0);
  expect(selectMyTaskDemos(undefined, today)).toHaveLength(0);
});

// ── Critical: incomplete tasks due from tomorrow onward (D+1 … D+N) ──────────
const task = (dueDate, status = "Pending", id = dueDate) => ({ id, dueDate, status });

test.each([
  ["2026-10-24T00:00:00", 1],
  ["2026-10-25T00:00:00", 2],
  ["2026-10-26T00:00:00", 3],
  ["2026-10-28T00:00:00", 5],
  ["2026-12-02T00:00:00", 40],
  ["2027-10-23T00:00:00", 365],
  ["2026-10-23T00:00:00", null], // today
  ["2026-10-22T00:00:00", null], // overdue
])("pending task due %s → Critical D+%s", (dueDate, expected) => {
  expect(criticalTaskOffset(task(dueDate), today)).toBe(expected);
});

test("completed tasks and tasks without a valid due date are excluded", () => {
  expect(criticalTaskOffset(task("2026-10-24T00:00:00", "Completed"), today)).toBeNull();
  expect(criticalTaskOffset(task("2026-11-30T00:00:00", " completed "), today)).toBeNull();
  expect(criticalTaskOffset(task(null), today)).toBeNull();
  expect(criticalTaskOffset(task("not a date"), today)).toBeNull();
  expect(criticalTaskOffset(null, today)).toBeNull();
});

test("Critical crosses month-end, year-end and leap day", () => {
  expect(criticalTaskOffset(task("2026-11-01T00:00:00"), moment("2026-10-30T22:00:00"))).toBe(2);
  expect(criticalTaskOffset(task("2027-01-01T00:00:00"), moment("2026-12-31T09:00:00"))).toBe(1);
  expect(criticalTaskOffset(task("2028-03-01T00:00:00"), moment("2028-02-28T23:00:00"))).toBe(2);
  expect(criticalTaskOffset(task("2028-02-29T00:00:00"), moment("2028-02-28T08:00:00"))).toBe(1);
});

test("groupCriticalTasks: one group per due date, nearest first; the count is the tasks listed", () => {
  const tasks = [
    task("2026-10-28T00:00:00", "Pending", "t5"),
    task("2026-10-24T00:00:00", "Pending", "t1a"),
    task("2026-10-24T00:00:00", "Completed", "done"),
    task("2026-10-25T00:00:00", "Pending", "t2"),
    task("2026-10-24T00:00:00", "Pending", "t1b"),
    task("2026-10-23T00:00:00", "Pending", "today"),
    task("2026-10-20T00:00:00", "Pending", "overdue"),
  ];
  const groups = groupCriticalTasks(tasks, today);
  expect(groups.map((g) => [g.offset, g.dueDate, g.tasks.map((t) => t.id)])).toEqual([
    [1, "2026-10-24", ["t1a", "t1b"]],
    [2, "2026-10-25", ["t2"]],
    [5, "2026-10-28", ["t5"]],
  ]);
  const count = tasks.filter((t) => criticalTaskOffset(t, today) !== null).length;
  expect(count).toBe(4);
  expect(groups.reduce((n, g) => n + g.tasks.length, 0)).toBe(count);
  // Completing a task removes it on the next refresh.
  tasks[1].status = "Completed";
  expect(groupCriticalTasks(tasks, today)[0].tasks.map((t) => t.id)).toEqual(["t1b"]);
  expect(groupCriticalTasks([], today)).toEqual([]);
});

test("Critical has no upper limit: D+10 and D+100 are listed, nearest first", () => {
  const due = (n) => moment("2026-10-23").add(n, "days").format("YYYY-MM-DD") + "T00:00:00";
  expect(criticalTaskOffset(task(due(10)), today)).toBe(10);
  expect(criticalTaskOffset(task(due(100)), today)).toBe(100);
  const groups = groupCriticalTasks([task(due(100), "Pending", "far"), task(due(1), "Pending", "near"), task(due(10), "Pending", "mid")], today);
  expect(groups.map((g) => [g.offset, g.tasks[0].id])).toEqual([[1, "near"], [10, "mid"], [100, "far"]]);
  expect(groups[2].dueDate).toBe("2027-01-31");
});

// ── My Task: Demo Scheduled (20019) and Re-Schedule Demo (20028) ──────────────
test.each([20019, 20028])("status %s: demos 1, 2 and 3 days ahead are shown as D-1 … D-3", (code) => {
  expect(myTaskDemoOffset("2026-10-24T09:00:00", code, today)).toBe(1);
  expect(myTaskDemoOffset("2026-10-25T00:00:00", code, today)).toBe(2);
  expect(myTaskDemoOffset("2026-10-26T23:59:00", code, today)).toBe(3);
});

test.each([20019, 20028])("status %s: today, past and D-4+ demos are not shown", (code) => {
  expect(myTaskDemoOffset("2026-10-23T22:00:00", code, today)).toBeNull(); // today
  expect(myTaskDemoOffset("2026-10-22T09:00:00", code, today)).toBeNull(); // yesterday
  expect(myTaskDemoOffset("2026-10-27T09:00:00", code, today)).toBeNull(); // D-4
  expect(myTaskDemoOffset("2026-11-30T09:00:00", code, today)).toBeNull(); // far ahead
});

test("Demo Scheduled / Re-Schedule Demo rows are listed and counted once, soonest first", () => {
  const row = (id, startTime, enrollmentStatusCode) => ({ scheduleDetailsId: id, startTime, enrollmentStatusCode });
  const list = selectMyTaskDemos([
    row("sched", "2026-10-26T10:00:00", 20019), // D-3
    row("resched", "2026-10-24T10:00:00", 20028), // D-1
    row("resched", "2026-10-24T10:00:00", 20028), // duplicate from the next month's load
    row("later", "2026-10-28T10:00:00", 20019), // D-5 → outside the window
  ], today);
  expect(list.map((d) => [d.scheduleDetailsId, d.dDay])).toEqual([["resched", 1], ["sched", 3]]);
});
