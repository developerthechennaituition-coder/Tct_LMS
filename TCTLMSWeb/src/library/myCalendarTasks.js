import moment from "moment";
import { daysUntilDemo } from "./demoFollowUp";

// My Calendar → Tasks. Both rules compare calendar dates only (time of day ignored), so they move
// on by themselves every day. Nothing here is saved.

// My Task: upcoming demo sessions whose actual scheduled date is 1-3 calendar days from today
// (D-1 = tomorrow, D-2, D-3), while the enrolment's saved status still needs follow-up. Codes are the existing
// Type_Code values (group 200):
//   Demo Pending 20001 / 20002 / 20012 / 20013 (DemoPendingTutorNotAssigned, …Assigned,
//   …AssignedNotApproved, …AssignedApproved), DP Short Follow-up 20009, DP Long Follow-up 20006,
//   Re-Demo 20007, 2nd Re-Demo 20045, Demo Cancelled Tutor Not Available 20046,
//   Demo Cancelled Parent Not Available 20047, Demo Scheduled 20019, Re-Schedule Demo 20028
//   (scheduling / rescheduling a demo sets 20019 / 20028, so an upcoming demo normally carries one of them).
export const MY_TASK_MAX_DAYS = 3;
export const MY_TASK_STATUS_CODES = [20001, 20002, 20012, 20013, 20009, 20006, 20007, 20045, 20046, 20047, 20019, 20028];

// 1-3 for an eligible demo that many days ahead; today, past, 4+ days, missing or other status → null.
export const myTaskDemoOffset = (demoStart, enrollmentStatusCode, today = moment()) => {
  if (enrollmentStatusCode === null || enrollmentStatusCode === undefined) return null;
  if (!MY_TASK_STATUS_CODES.includes(Number(enrollmentStatusCode))) return null;
  const days = daysUntilDemo(demoStart, today);
  return days !== null && days >= 1 && days <= MY_TASK_MAX_DAYS ? days : null;
};

// The My Task list from loaded demo rows (several months may repeat a session): each session once,
// eligible ones only, soonest first. Its length is the tab count.
export const selectMyTaskDemos = (rows, today = moment()) => {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : [])
    .filter((d) => d && (seen.has(d.scheduleDetailsId) ? false : seen.add(d.scheduleDetailsId)))
    .map((d) => ({ ...d, dDay: myTaskDemoOffset(d.startTime, d.enrollmentStatusCode, today) }))
    .filter((d) => d.dDay !== null)
    .sort((a, b) => a.dDay - b.dDay || moment(a.startTime).diff(moment(b.startTime)));
};

// Critical: incomplete tasks due from tomorrow onward (D+1 … D+N), by their Due Date. No upper limit.
export const isTaskCompleted = (task) => String(task?.status || "").trim().toLowerCase() === "completed";

// N (≥ 1) for an incomplete task due N calendar days from today; today, overdue, completed or no valid
// due date → null.
export const criticalTaskOffset = (task, today = moment()) => {
  if (!task || isTaskCompleted(task)) return null;
  const days = daysUntilDemo(task.dueDate, today);
  return days !== null && days >= 1 ? days : null;
};

// Critical groups: one per due date, nearest first, each with its D+N value and tasks.
export const groupCriticalTasks = (tasks, today = moment()) => {
  const groups = new Map();
  (Array.isArray(tasks) ? tasks : []).forEach((task) => {
    const offset = criticalTaskOffset(task, today);
    if (offset === null) return;
    if (!groups.has(offset)) groups.set(offset, { offset, dueDate: moment(task.dueDate).format("YYYY-MM-DD"), tasks: [] });
    groups.get(offset).tasks.push(task);
  });
  return [...groups.values()].sort((a, b) => a.offset - b.offset);
};
