import { resolveClassUserIds, resetUserTimeZonesForTests } from "./userTimeZones";
import { getTutorById } from "../apiservices/TutorService";

jest.mock("../apiservices/TutorService", () => ({ getTutorById: jest.fn() }));
jest.mock("../apiservices/UserService", () => ({ getTCTUserById: jest.fn() }));
jest.mock("../apiservices/StudentEnrollmentService", () => ({ getStudent: jest.fn() }));

// The rated user of a class rating (Calender.js formSubmit) comes from these ids.
const TUTOR_ID = "77639bf9-0ae4-4128-9bd3-4e5cf6c3aa35"; // Schedule.TutorId stores the Tutor.Id
const TUTOR_USER_ID = "f3c49264-5a45-4445-aa63-08def3d01e70";
const STUDENT_USER_ID = "741d6960-5d6f-44f4-463c-08deee82939c";

beforeEach(() => {
  resetUserTimeZonesForTests();
  jest.resetAllMocks();
});

test("empty tutorUserId (class stores a Tutor.Id): the tutor's User.Id comes from GET /Tutor/gettutorbyid", async () => {
  getTutorById.mockResolvedValue({ data: { id: TUTOR_USER_ID } });
  const ids = await resolveClassUserIds({ tutorUserId: null, tutorId: TUTOR_ID, studentUserId: null, calendarGuestType: "student", calendarOwnerUserId: STUDENT_USER_ID });
  expect(getTutorById).toHaveBeenCalledWith(TUTOR_ID);
  expect(ids).toEqual({ tutorUserId: TUTOR_USER_ID, studentUserId: STUDENT_USER_ID });
});

test("a tutorUserId already on the event is used as is (no lookup)", async () => {
  const ids = await resolveClassUserIds({ tutorUserId: TUTOR_USER_ID, tutorId: TUTOR_ID, studentUserId: STUDENT_USER_ID });
  expect(getTutorById).not.toHaveBeenCalled();
  expect(ids).toEqual({ tutorUserId: TUTOR_USER_ID, studentUserId: STUDENT_USER_ID });
});

test("a failed tutor lookup gives null (the caller then skips the rating instead of posting a null id)", async () => {
  getTutorById.mockRejectedValue(new Error("network"));
  const ids = await resolveClassUserIds({ tutorUserId: null, tutorId: TUTOR_ID });
  expect(ids.tutorUserId).toBeNull();
});
