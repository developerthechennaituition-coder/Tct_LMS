import { classCalendarLink, normalizeChatMenu, tutorAssignmentLabel } from "./workflowDisplay";

test("only existing leaf Chat links are repaired without adding permission", () => {
  const input = [{ text: "Accounts", subMenu: [{ text: "Chat", link: "/wrong", id: 7 }] }, { text: "Student List", link: "/students" }];
  const result = normalizeChatMenu(input);
  expect(result[0].subMenu[0]).toEqual({ text: "Chat", link: "/app-chat", id: 7 });
  expect(result[1]).toEqual(input[1]);
  expect(input[0].subMenu[0].link).toBe("/wrong");
  expect(normalizeChatMenu(null)).toEqual([]);
  expect(normalizeChatMenu({})).toEqual([]);
});

test("assigned tutor label changes without changing other actions", () => {
  expect(tutorAssignmentLabel("Assign Tutor Slots", "tutor-id")).toBe("Change Tutor");
  expect(tutorAssignmentLabel("Assign Tutor", null)).toBe("Assign Tutor");
  expect(tutorAssignmentLabel("Assign Tutor", "00000000-0000-0000-0000-000000000000")).toBe("Assign Tutor");
  expect(tutorAssignmentLabel("Approve", "tutor-id")).toBe("Approve");
});

test.each(["OperationsAdmin", "AccountsAdmin", "Student"])("%s chat actions open student's class and correct month", role => {
  const link = classCalendarLink({ studentUserId: "student-user", tutorUserId: "tutor-user", scheduleDetailsId: "class-id", date: "2026-09-19T00:00:00" }, role);
  expect(link).toBe("/tct-student-calendar/?id=student-user&scheduleDetailsId=class-id&month=9&year=2026");
});

test("tutors open their own calendar; missing context is rejected", () => {
  expect(classCalendarLink({ tutorUserId: "tutor", scheduleDetailsId: "class", date: "2026-10-01" }, "Tutor"))
    .toBe("/tct-tutor-calender/?id=tutor&scheduleDetailsId=class&month=10&year=2026");
  expect(() => classCalendarLink({}, "Tutor")).toThrow();
});
