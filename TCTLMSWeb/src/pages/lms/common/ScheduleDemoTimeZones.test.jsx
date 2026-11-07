import React from "react";
import { act, render, screen } from "@testing-library/react";
import { DemoLocalTimes, DemoTimeZoneNote, ParticipantTimeZones } from "./ScheduleDemoTimeZones";
import { resetUserTimeZonesForTests } from "../../../library/userTimeZones";
import { getTCTUserById } from "../../../apiservices/UserService";

jest.mock("../../../apiservices/TutorService", () => ({ getTutorById: jest.fn() }));
jest.mock("../../../apiservices/UserService", () => ({ getTCTUserById: jest.fn() }));
jest.mock("../../../apiservices/StudentEnrollmentService", () => ({ getStudent: jest.fn() }));

const STUDENT_USER_ID = "741d6960-5d6f-44f4-463c-08deee82939c";
const TUTOR_USER_ID = "f3c49264-5a45-4445-aa63-08def3d01e70";
const COORDINATOR_USER_ID = "de5562f6-ee08-43de-4be0-08dd5e809493";
const people = { studentUserId: STUDENT_USER_ID, tutorUserId: TUTOR_USER_ID, coordinatorUserId: COORDINATOR_USER_ID };

// Lets the lookup promises settle.
const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

// Saved timezone per User.Id; undefined = profile without a timezone.
const withTimeZones = (zones) => {
  getTCTUserById.mockImplementation((id) => Promise.resolve({ data: { id, timeZoneId: zones[id] } }));
};

// 10 Nov 2026 picked in the date picker; a 6:00–7:00 PM slot (stored as India time).
const DATE = new Date("2026-11-10T00:00:00+05:30");
const SLOTS = [{ dayInNo: 2, slots: [{ startTime: "6:00 PM", endTime: "7:00 PM" }] }];

beforeEach(() => {
  resetUserTimeZonesForTests();
  jest.resetAllMocks();
});

test("shows the student's, tutor's and coordinator's saved time zones", async () => {
  withTimeZones({ [STUDENT_USER_ID]: "America/New_York", [TUTOR_USER_ID]: "Asia/Kolkata", [COORDINATOR_USER_ID]: "Asia/Dubai" });
  render(<ParticipantTimeZones {...people} />);
  await settle();
  expect(screen.getByText("Time zones")).toBeInTheDocument();
  expect(screen.getByText("America/New_York")).toBeInTheDocument();
  expect(screen.getByText("Asia/Kolkata")).toBeInTheDocument();
  expect(screen.getByText("Asia/Dubai")).toBeInTheDocument();
});

test("a missing time zone, profile or user id shows 'Time zone not set' (never a guessed value)", async () => {
  withTimeZones({ [STUDENT_USER_ID]: undefined });
  getTCTUserById.mockImplementation((id) =>
    id === TUTOR_USER_ID ? Promise.reject(new Error("not found")) : Promise.resolve({ data: { id, timeZoneId: undefined } }));
  render(<ParticipantTimeZones studentUserId={STUDENT_USER_ID} tutorUserId={TUTOR_USER_ID} coordinatorUserId="00000000-0000-0000-0000-000000000000" />);
  await settle();
  expect(screen.getAllByText("Time zone not set")).toHaveLength(3);
});

test("names the time zone the date and slots are in", () => {
  render(<DemoTimeZoneNote />);
  expect(screen.getByText(/Date and time slots are in India Standard Time \(Asia\/Kolkata\)/)).toBeInTheDocument();
});

test("different time zones: the selected slot in each participant's own local time", async () => {
  withTimeZones({ [STUDENT_USER_ID]: "America/New_York", [TUTOR_USER_ID]: "Asia/Kolkata", [COORDINATOR_USER_ID]: undefined });
  render(<DemoLocalTimes date={DATE} slotGroups={SLOTS} {...people} />);
  await settle();
  // 6:00 PM IST on 10 Nov = 7:30 AM EST the same day.
  expect(screen.getByText("10-Nov-2026, 7:30–8:30 AM (America/New_York)")).toBeInTheDocument();
  expect(screen.getByText("10-Nov-2026, 6:00–7:00 PM (Asia/Kolkata)")).toBeInTheDocument();
  expect(screen.getByText("Time zone not set")).toBeInTheDocument();
  expect(screen.queryByText(/All participants/)).not.toBeInTheDocument();
});

test("everyone in the slots' time zone: one line for all participants", async () => {
  withTimeZones({ [STUDENT_USER_ID]: "Asia/Kolkata", [TUTOR_USER_ID]: "Asia/Kolkata", [COORDINATOR_USER_ID]: "Asia/Kolkata" });
  render(<DemoLocalTimes date={DATE} slotGroups={SLOTS} {...people} />);
  await settle();
  expect(screen.getByText("All participants: 10-Nov-2026, 6:00–7:00 PM (Asia/Kolkata)")).toBeInTheDocument();
});

test("nothing is shown before a date and a slot are selected", async () => {
  withTimeZones({ [STUDENT_USER_ID]: "America/New_York" });
  const { container, rerender } = render(<DemoLocalTimes date={null} slotGroups={SLOTS} {...people} />);
  await settle();
  expect(container).toBeEmptyDOMElement();
  rerender(<DemoLocalTimes date={DATE} slotGroups={[]} {...people} />);
  await settle();
  expect(container).toBeEmptyDOMElement();
});
