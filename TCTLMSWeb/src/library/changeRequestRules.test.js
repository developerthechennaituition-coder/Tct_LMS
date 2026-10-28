import {
  CHANGE_REQUEST_PAGES, STUDENT_CHANGE, STUDENT_CHANGE_REASONS, TUTOR_CHANGE, TUTOR_CHANGE_REASONS,
  groupBySubject, reasonsFor, validateChangeRequest, validateDecision,
} from "./changeRequestRules";

test("reason lists match the requirement, by request type", () => {
  expect(TUTOR_CHANGE_REASONS).toEqual([
    "Lack of Compatibility", "Unprofessional Behaviour", "Communication Barrier", "Skill Mismatch", "Lack of Personalization",
  ]);
  expect(STUDENT_CHANGE_REASONS).toEqual([
    "Lack of Effort and Commitment", "Disrespectful or Disruptive Behaviour", "Frequent Payment Delays",
    "Unrealistic Expectations", "Incompatible Goals or Levels",
  ]);
  expect(reasonsFor(TUTOR_CHANGE)).toBe(TUTOR_CHANGE_REASONS);
  expect(reasonsFor(STUDENT_CHANGE)).toBe(STUDENT_CHANGE_REASONS);
});

test("pages use the menu links registered in the database script", () => {
  expect(CHANGE_REQUEST_PAGES.tutorChange.link).toBe("/lms/change-request/tutor-change");
  expect(CHANGE_REQUEST_PAGES.studentChange.link).toBe("/lms/change-request/student-change");
  expect(CHANGE_REQUEST_PAGES.students).toMatchObject({ link: "/lms/operation/change-requests/students", list: "students", type: TUTOR_CHANGE });
  expect(CHANGE_REQUEST_PAGES.tutors).toMatchObject({ link: "/lms/operation/change-requests/tutors", list: "tutors", type: STUDENT_CHANGE });
});

test.each([
  [{}, TUTOR_CHANGE, ["reason", "description"]],
  [{ reason: "Skill Mismatch", description: "   " }, TUTOR_CHANGE, ["description"]],
  [{ reason: "Frequent Payment Delays", description: "x" }, TUTOR_CHANGE, ["reason"]], // a tutor's reason
  [{ reason: "Skill Mismatch", description: "x" }, STUDENT_CHANGE, ["reason"]], // a student's reason
  [{ reason: "Skill Mismatch", description: "a".repeat(2001) }, TUTOR_CHANGE, ["description"]],
  [{ reason: "Skill Mismatch", description: "Not a good fit." }, TUTOR_CHANGE, []],
  [{ reason: " Frequent Payment Delays ", description: " Fees unpaid. " }, STUDENT_CHANGE, []],
])("validateChangeRequest(%j, %s) flags %j", (form, type, fields) => {
  expect(Object.keys(validateChangeRequest(form, type)).sort()).toEqual([...fields].sort());
});

test("approval needs a listed tutor with a rate; rejection needs a reason", () => {
  const tutors = [{ tutorId: "a", rate: 300 }, { tutorId: "b", rate: 0 }, { tutorId: "c", rate: null }];
  expect(validateDecision("approve", { newTutorId: "", tutors })).toHaveProperty("newTutorId");
  expect(validateDecision("approve", { newTutorId: "zzz", tutors })).toHaveProperty("newTutorId");
  expect(validateDecision("approve", { newTutorId: "b", tutors })).toHaveProperty("newTutorId");
  expect(validateDecision("approve", { newTutorId: "c", tutors })).toHaveProperty("newTutorId");
  expect(validateDecision("approve", { newTutorId: "a", tutors })).toEqual({});
  expect(validateDecision("reject", { note: "  " })).toHaveProperty("note");
  expect(validateDecision("reject", { note: "Tutor is a good fit." })).toEqual({});
  expect(validateDecision("approve", { newTutorId: "a", tutors, note: "x".repeat(1001) })).toHaveProperty("note");
});

test("groupBySubject groups courses by subject in alphabetical order", () => {
  const groups = groupBySubject([
    { subjectName: "Maths", studentName: "B" },
    { subjectName: "Chemistry", studentName: "A" },
    { subjectName: "Maths", studentName: "C" },
    { subjectName: null, studentName: "D" },
  ]);
  expect(groups.map((g) => [g.subject, g.items.length])).toEqual([["Chemistry", 1], ["Maths", 2], ["Other", 1]]);
  expect(groupBySubject(undefined)).toEqual([]);
});
