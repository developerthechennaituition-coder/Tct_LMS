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

// "Assigned to me" count (tab and sidebar Tasks badge): the user's own tasks that are not completed. Submitting for
// verification completes a task, so it leaves the count; Changes Requested keeps the Completed status, as before.
export const openAssignedTaskCount = (tasks, userId) =>
  (Array.isArray(tasks) ? tasks : []).filter(
    (t) => String(t?.assignedToUserId).toLowerCase() === String(userId).toLowerCase() && t.status !== "Completed"
  ).length;

// The Tasks panel announces the count after each load, so the sidebar badge updates without loading the tasks again.
export const TASK_COUNT_EVENT = "tct:task-count";
export const publishTaskCount = (count) => window.dispatchEvent(new CustomEvent(TASK_COUNT_EVENT, { detail: { count } }));

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

// ─── Deadline time and verification workflow ───────────────────────────────────

// "05-Nov-2026" for date-only (older) tasks, "05-Nov-2026, 05:30 PM" when a due time is set. The due date and
// time are the assigner's wall-clock values and are shown as saved, like the due date always was.
export const formatTaskDeadline = (task) => {
  if (!task?.dueDate) return "—";
  const date = moment(task.dueDate).format("DD-MMM-YYYY");
  const time = task.dueTime ? moment(String(task.dueTime), ["HH:mm:ss", "HH:mm"], true) : null;
  return time && time.isValid() ? `${date}, ${time.format("hh:mm A")}` : date;
};

// True when the date ("YYYY-MM-DD") and time ("HH:mm") form a valid deadline earlier than now.
export const isDeadlineBeforeNow = (dueDate, dueTime, now = moment()) => {
  if (!dueDate || !dueTime) return false;
  const deadline = moment(`${dueDate} ${dueTime}`, "YYYY-MM-DD HH:mm", true);
  return deadline.isValid() && deadline.isBefore(now, "minute");
};

// Effective workflow status from the API (verificationStatus) → label. Assigned / Completed keep the existing
// Pending / Overdue / Completed badge; the others get their own badge.
export const VERIFICATION_LABELS = Object.freeze({
  Assigned: "Assigned",
  InProgress: "In Progress",
  Completed: "Completed",
  PendingVerification: "Pending Verification",
  ChangesRequested: "Changes Requested",
  Verified: "Verified",
});

export const VERIFICATION_ACTION_LABELS = Object.freeze({
  Started: "Marked in progress",
  Submitted: "Submitted for verification",
  Resubmitted: "Resubmitted for verification",
  Verified: "Verified",
  ChangesRequested: "Changes requested",
});

export const verificationLabel = (status) => VERIFICATION_LABELS[status] || status || "";

// Latest submission (notes + files) and latest review (comment) from the history, which the API sends newest first.
export const latestSubmission = (task) =>
  (task?.verificationHistory || []).find((h) => h.action === "Submitted" || h.action === "Resubmitted") || null;
export const latestReview = (task) =>
  (task?.verificationHistory || []).find((h) => h.action === "Verified" || h.action === "ChangesRequested") || null;

// Same limits as the server (MyCalendarService): up to 5 files, 10 MB each, 25 MB in total, listed types only.
export const PROOF_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt";
export const validateProofFiles = (files) => {
  const list = Array.from(files || []);
  const allowed = PROOF_ACCEPT.split(",");
  if (list.length > 5) return "Attach up to 5 files.";
  const bad = list.some((f) => !f.size || f.size > 10 * 1024 * 1024 || !allowed.includes(`.${String(f.name).split(".").pop()}`.toLowerCase()));
  if (bad || list.reduce((sum, f) => sum + f.size, 0) > 25 * 1024 * 1024)
    return "Use PDF, Word, Excel, JPG, PNG or TXT files, up to 10 MB each and 25 MB in total. Empty files are not allowed.";
  return "";
};

// ─── Deadline state (Due Soon / Due Today / Overdue) ───────────────────────────
// Calculated on the fly, never saved, and separate from the task's status. Due dates and times are wall-clock values in
// the application's storage timezone (Asia/Kolkata, see CLASS_STORAGE_TIME_ZONE in userTimeZones), which the server's
// reminder job uses too. India has no daylight saving, so the offset is fixed.
const STORAGE_UTC_OFFSET_MINUTES = 330;
export const DUE_SOON_DAYS = 7;

// The moment the task becomes overdue: the due time on the due date, or the end of the due date for date-only tasks.
export const taskDeadline = (task) => {
  if (!task?.dueDate) return null;
  const date = moment.utc(moment(task.dueDate).format("YYYY-MM-DD"), "YYYY-MM-DD", true);
  if (!date.isValid()) return null;
  const time = task.dueTime ? moment(String(task.dueTime), ["HH:mm:ss", "HH:mm"], true) : null;
  const wallClock = time && time.isValid() ? date.add(time.hours(), "hours").add(time.minutes(), "minutes") : date.add(1, "day");
  return wallClock.subtract(STORAGE_UTC_OFFSET_MINUTES, "minutes");
};

// { state, ms } for a task that is not completed (or submitted for verification, which completes it):
//   dueSoon  — due 1-7 calendar days from today (D-7 … D-1); ms = time left
//   dueToday — due today, deadline not reached; ms = time left
//   overdue  — deadline passed; ms = time since the deadline
// null otherwise (completed, no valid due date, or due more than 7 days ahead).
export const taskDeadlineState = (task, now = moment()) => {
  if (!task || isTaskCompleted(task)) return null;
  const deadline = taskDeadline(task);
  if (!deadline) return null;
  const current = moment(now).utc();
  if (!current.isBefore(deadline)) return { state: "overdue", ms: current.diff(deadline) };
  const today = moment.utc(moment(now).utcOffset(STORAGE_UTC_OFFSET_MINUTES).format("YYYY-MM-DD"), "YYYY-MM-DD");
  const days = moment.utc(moment(task.dueDate).format("YYYY-MM-DD"), "YYYY-MM-DD").diff(today, "days");
  if (days <= 0) return { state: "dueToday", ms: deadline.diff(current) };
  return days <= DUE_SOON_DAYS ? { state: "dueSoon", ms: deadline.diff(current) } : null;
};

// "3d 4h", "5h 20m", "12m", "less than a minute".
export const formatDeadlineDuration = (ms) => {
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return minutes > 0 ? `${minutes}m` : "less than a minute";
};

export const DEADLINE_LABELS = Object.freeze({ dueSoon: "Due Soon", dueToday: "Critical — Due Today", overdue: "Overdue" });

// "Due in 3d 4h" / "5h 20m left" / "Overdue by 1d 2h".
export const deadlineDetail = ({ state, ms }) => {
  const duration = formatDeadlineDuration(ms);
  if (state === "overdue") return `Overdue by ${duration}`;
  return state === "dueToday" ? `${duration} left` : `Due in ${duration}`;
};
