// My Calendar regular classes (GET /my-calendar/classes): Operations / Operations Admin see their owned
// students' classes; no other role (the API enforces the same). The tutor is the one on each schedule row.

// True for the roles whose My Calendar shows regular classes (the stored login role, any case).
export const showsClassEvents = (role) => ["operations", "operationsadmin"].includes(String(role || "").trim().toLowerCase());

// One class row from the API → the event shape the shared calendar reads (read-only, no status modal).
export const toClassEvent = (item) => ({
  id: `my-class-${item.scheduleDetailsId}`,
  scheduleDetailsId: item.scheduleDetailsId,
  scheduleId: item.scheduleId,
  studentId: item.studentId,
  title: [item.studentName, item.subjectName].filter(Boolean).join(" · ") || item.title || "Class",
  start: item.startTime,
  end: item.endTime,
  startTime: item.startTime,
  endTime: item.endTime,
  studentName: item.studentName,
  tutorName: item.tutorName,
  subjectName: item.subjectName,
  subjectId: item.subjectId,
  scheduleType: item.scheduleType,
  className: "mc-class-event",
  meetingLink: item.meetingLink,
  scheduleStatusName: item.statusName,
  salesDetailsId: item.salesDetailsId,
  salesId: item.salesId,
  isClass: true,
  isBlocked: false,
  canUpdateStatus: false,
});

// Classes shown on the calendar: one event per class session, and only without a status or D-day filter
// (those filters are about demo enrolments, so a filtered view keeps showing demos only).
export const visibleClassEvents = (classes, { allStatuses, dDayActive }) => {
  if (!allStatuses || dDayActive || !Array.isArray(classes)) return [];
  const seen = new Set();
  return classes.filter((c) => (seen.has(c.scheduleDetailsId) ? false : seen.add(c.scheduleDetailsId)));
};
