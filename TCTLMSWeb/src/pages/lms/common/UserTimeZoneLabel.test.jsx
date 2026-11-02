import React from "react";
import { act, render, screen } from "@testing-library/react";
import { PersonTimeZoneLabel } from "./UserTimeZoneLabel";
import { resetUserTimeZonesForTests } from "../../../library/userTimeZones";
import { getTutorById } from "../../../apiservices/TutorService";
import { getTCTUserById } from "../../../apiservices/UserService";
import { getStudent } from "../../../apiservices/StudentEnrollmentService";

jest.mock("../../../apiservices/TutorService", () => ({ getTutorById: jest.fn() }));
jest.mock("../../../apiservices/UserService", () => ({ getTCTUserById: jest.fn() }));
jest.mock("../../../apiservices/StudentEnrollmentService", () => ({ getStudent: jest.fn() }));

const TUTOR_ID = "2f656240-6e26-4811-9c28-04f6ba95a1fd";
const TUTOR_USER_ID = "f3c49264-5a45-4445-aa63-08def3d01e70";
const STUDENT_ID = "0b6f3c9e-7d2a-4c1e-9f00-1a2b3c4d5e6f";
const STUDENT_USER_ID = "741d6960-5d6f-44f4-463c-08deee82939c";

// Lets the lookup promises settle (they are not timers, so fake timers do not run them).
const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const tutorWithTimeZone = (timeZoneId) => {
  getTutorById.mockResolvedValue({ data: { id: TUTOR_USER_ID } });
  getTCTUserById.mockResolvedValue({ data: { id: TUTOR_USER_ID, timeZoneId } });
};

const renderTutor = () => render(<PersonTimeZoneLabel className="mt-1" label="Tutor timezone" kind="tutor" personId={TUTOR_ID} />);

beforeEach(() => {
  resetUserTimeZonesForTests();
  jest.resetAllMocks();
  jest.useFakeTimers("modern");
  // 12:21:30 UTC: 7:21 AM in New York (EST after 1 Nov 2026).
  jest.setSystemTime(new Date("2026-11-02T12:21:30Z"));
});

afterEach(() => {
  jest.useRealTimers();
});

test("shows the saved timezone and that timezone's current local time", async () => {
  getStudent.mockResolvedValue({ data: { userId: STUDENT_USER_ID } });
  getTCTUserById.mockResolvedValue({ data: { id: STUDENT_USER_ID, timeZoneId: "America/New_York" } });
  const { container } = render(<PersonTimeZoneLabel label="Student timezone" kind="student" personId={STUDENT_ID} />);
  await settle();
  expect(getStudent).toHaveBeenCalledWith(STUDENT_ID);
  expect(getTCTUserById).toHaveBeenCalledWith(STUDENT_USER_ID);
  expect(container.textContent).toBe("Student timezone: America/New_York·Local time:7:21 AM");
});

test("uses the person's timezone, not the browser's", async () => {
  // Neither India (this project's usual browser timezone) nor UTC: 12:21 UTC is 1:21 AM next day in Auckland (NZDT).
  tutorWithTimeZone("Pacific/Auckland");
  renderTutor();
  await settle();
  expect(screen.getByText("1:21 AM")).toBeInTheDocument();
});

test("updates the local time at the start of each minute", async () => {
  tutorWithTimeZone("America/New_York");
  renderTutor();
  await settle();
  expect(screen.getByText("7:21 AM")).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(30000)); // 12:22:00 UTC
  expect(screen.getByText("7:22 AM")).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(60000)); // 12:23:00 UTC
  expect(screen.getByText("7:23 AM")).toBeInTheDocument();
});

test("shows Loading… and no local time while the lookup is pending", () => {
  getTutorById.mockReturnValue(new Promise(() => {}));
  renderTutor();
  expect(screen.getByText("Loading…")).toBeInTheDocument();
  expect(screen.queryByText("Local time:")).not.toBeInTheDocument();
});

test("shows 'Timezone not set' and no local time when no timezone is saved", async () => {
  tutorWithTimeZone(null);
  renderTutor();
  await settle();
  expect(screen.getByText("Timezone not set")).toBeInTheDocument();
  expect(screen.queryByText("Local time:")).not.toBeInTheDocument();
});

test("shows 'Timezone unavailable' and no local time when the lookup fails", async () => {
  getTutorById.mockRejectedValue(new Error("network"));
  renderTutor();
  await settle();
  expect(screen.getByText("Timezone unavailable")).toBeInTheDocument();
  expect(getTCTUserById).not.toHaveBeenCalled();
  expect(screen.queryByText("Local time:")).not.toBeInTheDocument();
});

test("shows no guessed time for a timezone the browser cannot use", async () => {
  tutorWithTimeZone("Not/AZone");
  renderTutor();
  await settle();
  expect(screen.getByText("Not/AZone")).toBeInTheDocument();
  expect(screen.queryByText("Local time:")).not.toBeInTheDocument();
});

test("keeps the caller's className and lets long names wrap", async () => {
  tutorWithTimeZone("America/Argentina/ComodRivadavia");
  const { container } = renderTutor();
  await settle();
  // Layout styles live on the wrapper elements, which Testing Library queries do not return.
  // eslint-disable-next-line testing-library/no-node-access
  expect(container.firstChild).toHaveClass("mt-1");
  // eslint-disable-next-line testing-library/no-node-access
  expect(screen.getByText("America/Argentina/ComodRivadavia").parentElement).toHaveStyle({ overflowWrap: "anywhere" });
});
