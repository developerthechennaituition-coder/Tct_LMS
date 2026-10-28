// Tutor Change / Student Change requests: page settings and form checks. The server applies the same
// rules (AssignmentChangeRequestService); these only give the user immediate feedback.

export const TUTOR_CHANGE = "TutorChange";
export const STUDENT_CHANGE = "StudentChange";

export const TUTOR_CHANGE_REASONS = [
  "Lack of Compatibility",
  "Unprofessional Behaviour",
  "Communication Barrier",
  "Skill Mismatch",
  "Lack of Personalization",
];

export const STUDENT_CHANGE_REASONS = [
  "Lack of Effort and Commitment",
  "Disrespectful or Disruptive Behaviour",
  "Frequent Payment Delays",
  "Unrealistic Expectations",
  "Incompatible Goals or Levels",
];

export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_NOTE_LENGTH = 1000;

// Menu links (Settings → Role Permission); each page is shown only when its link is permitted.
export const CHANGE_REQUEST_PAGES = {
  tutorChange: {
    link: "/lms/change-request/tutor-change",
    type: TUTOR_CHANGE,
    title: "Tutor Change",
    sub: "Your tutors by subject. Ask Operations to change a tutor; your classes continue until Operations decides.",
    personLabel: "Tutor",
    button: "Tutor Change",
  },
  studentChange: {
    link: "/lms/change-request/student-change",
    type: STUDENT_CHANGE,
    title: "Student Change",
    sub: "Your students by subject. Ask Operations to move a student to another tutor; your classes continue until Operations decides.",
    personLabel: "Student",
    button: "Student Change",
  },
  students: {
    link: "/lms/operation/change-requests/students",
    type: TUTOR_CHANGE,
    list: "students",
    title: "Request from Students",
    sub: "Tutor Change requests raised by students. Review each request and choose a replacement tutor, or reject it.",
  },
  tutors: {
    link: "/lms/operation/change-requests/tutors",
    type: STUDENT_CHANGE,
    list: "tutors",
    title: "Request from Tutors",
    sub: "Student Change requests raised by tutors. Review each request and move the student to another tutor, or reject it.",
  },
};

export const reasonsFor = (type) => (type === STUDENT_CHANGE ? STUDENT_CHANGE_REASONS : TUTOR_CHANGE_REASONS);

// { reason?, description? } messages; empty object when the form can be sent.
export const validateChangeRequest = (form, type) => {
  const errors = {};
  const reason = String(form?.reason || "").trim();
  const description = String(form?.description || "").trim();
  if (!reason || !reasonsFor(type).includes(reason)) errors.reason = "Please select a reason.";
  if (!description) errors.description = "Please describe the reason for your request.";
  else if (description.length > MAX_DESCRIPTION_LENGTH) errors.description = `Use ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  return errors;
};

// Operations decision: approve needs a replacement tutor with a rate; reject needs a reason.
export const validateDecision = (decision, { newTutorId, note, tutors }) => {
  const errors = {};
  const trimmed = String(note || "").trim();
  if (trimmed.length > MAX_NOTE_LENGTH) errors.note = `Use ${MAX_NOTE_LENGTH} characters or fewer.`;
  if (decision === "approve") {
    const tutor = (tutors || []).find((t) => t.tutorId === newTutorId);
    if (!newTutorId) errors.newTutorId = "Select the new tutor.";
    else if (!tutor) errors.newTutorId = "Select a tutor from the list.";
    else if (!(Number(tutor.rate) > 0)) errors.newTutorId = "This tutor has no payment rate for this board, grade and subject.";
  } else if (decision === "reject" && !trimmed) {
    errors.note = "Please give the reason for rejecting this request.";
  }
  return errors;
};

// Group courses by subject for display (stable order: subject, then name).
export const groupBySubject = (assignments) => {
  const groups = new Map();
  (Array.isArray(assignments) ? assignments : []).forEach((a) => {
    const key = a?.subjectName || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  });
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([subject, items]) => ({ subject, items }));
};
