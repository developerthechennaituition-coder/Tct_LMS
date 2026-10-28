const emptyGuid = "00000000-0000-0000-0000-000000000000";
export const classCalendarLink = (context, role) => {
  const tutor = (role || "").trim().toLowerCase() === "tutor";
  const userId = tutor ? context?.tutorUserId : context?.studentUserId;
  const date = /^(\d{4})-(\d{2})-\d{2}/.exec(context?.date || "");
  if (!userId || userId === emptyGuid || !context?.scheduleDetailsId || !date)
    throw new Error("Class calendar context is missing.");
  const query = new URLSearchParams({ id: userId, scheduleDetailsId: context.scheduleDetailsId,
    month: String(Number(date[2])), year: date[1] });
  return `${tutor ? "/tct-tutor-calender/" : "/tct-student-calendar/"}?${query}`;
};

export const tutorAssignmentLabel = (label, tutorId) =>
  tutorId && tutorId !== emptyGuid && /^assign\s+tutor(?:\s+slots)?$/i.test((label || "").trim())
    ? "Change Tutor" : label;

// Only repair the destination of an already-authorized, leaf Chat menu entry.
// Never add menu entries or grant access to accounts without permission.
export const normalizeChatMenu = (items) => (Array.isArray(items) ? items : []).filter(Boolean).map(item => ({
  ...item,
  ...((item.text || "").trim().toLowerCase() === "chat" && !item.subMenu?.length
    ? { link: "/app-chat" } : {}),
  ...(Array.isArray(item.subMenu) ? { subMenu: normalizeChatMenu(item.subMenu) } : {}),
}));
