import { groupTutorAttendance } from "./tutorAttendanceSummary";
const row = { scheduleDetailsId: "class", tutorUserId: "tutor", tutorName: "Tutor", salesDetailsId: "subject",
  date: "2026-10-10T00:00:00", scheduleStatus: "Class Completed", parentPayment: 1000, tutorPayment: 250, tutorClassPayment: 375 };
test("attendance uses saved tutor class pay, never parent's rate or class-count multiplication", () => {
  const result = groupTutorAttendance([row]);
  expect(result[0].totalPayslipAmount).toBe(375);
  expect(result[0].childGroupList[0].tutorPayment).toBe(250);
  expect(result[0].childGroupList[0].parentPayment).toBeUndefined();
});
test("missing tutor payment never falls back to parent's fee", () => {
  expect(groupTutorAttendance([{ ...row, tutorClassPayment: null }])[0].totalPayslipAmount).toBe(0);
});
test("deduplicates schedule rows and totals different rates independently", () => {
  const result = groupTutorAttendance([row, row, { ...row, scheduleDetailsId: "second", tutorPayment: 300, tutorClassPayment: 600 }]);
  expect(result[0].totalPayslipAmount).toBe(975);
  expect(result[0].childGroupList).toHaveLength(2);
});
test("same-name tutors and different months remain separate", () => {
  expect(groupTutorAttendance([row, { ...row, scheduleDetailsId: "second", tutorUserId: "other" },
    { ...row, scheduleDetailsId: "third", date: "2026-09-01" }])).toHaveLength(3);
});
