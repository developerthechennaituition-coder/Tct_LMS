import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Operations from "./OperationsDashboard";
import OperationsAdmin from "./OperationsAdminDashboard";
import * as api from "../../../apiservices/DashboardService";

jest.mock("../../../apiservices/DashboardService");
jest.mock("../../../library/axios", () => ({ axios: { get: jest.fn(), post: jest.fn() } }));
jest.mock("../../../layout/head/Head", () => () => null);
jest.mock("../../../layout/content/Content", () => ({ children }) => <div>{children}</div>);
jest.mock("react-router-dom", () => ({ Link: ({ children }) => <span>{children}</span> }));
jest.mock("../../../components/Component", () => {
  const Box = ({ children }) => <div>{children}</div>;
  return { Block: Box, BlockBetween: Box, BlockHead: Box, BlockHeadContent: Box, BlockTitle: Box,
    Row: Box, Col: Box, Icon: () => null, Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button> };
});
jest.mock("recharts", () => {
  const Box = ({ children }) => <div>{children}</div>;
  return Object.fromEntries(["Area", "AreaChart", "Bar", "BarChart", "CartesianGrid", "Legend", "ResponsiveContainer",
    "Tooltip", "XAxis", "YAxis", "Cell"].map(name => [name, Box]));
});

// The server's persisted statuses and make-up rows, as getCurrentOperationsDashboard returns them.
const dashboard = (overrides = {}) => ({
  summary: { todayRescheduledClasses: 1 },
  rescheduledClasses: [{ scheduleDetailsId: "r1", tutorStatus: "Class Re-Scheduled" }],
  cancellations: [
    { scheduleDetailsId: "c1", isTutorCancelled: true, isStudentCancelled: false },
    { scheduleDetailsId: "c2", isTutorCancelled: true, isStudentCancelled: false },
    { scheduleDetailsId: "c3", isTutorCancelled: false, isStudentCancelled: true },
    // Operations' cancellation: counted in the card total but neither as tutor nor as student.
    { scheduleDetailsId: "c4", isTutorCancelled: false, isStudentCancelled: false, isOperationsCancelled: true },
  ],
  // The Rescheduled card's rows for the selected range (each original class once) with the server's window counts:
  // a status re-schedule by the tutor, a tutor cancellation's make-up, a student cancellation's make-up, and one by
  // Operations.
  rescheduledInRange: [
    { scheduleDetailsId: "r1", rescheduledBy: "tutor", status: "Class Re-Scheduled", totalRescheduled: 4, tutorRescheduled: 2, studentRescheduled: 1, operationsRescheduled: 1 },
    { scheduleDetailsId: "m1", rescheduledBy: "tutor", status: "Make-up (cancelled by Tutor)", totalRescheduled: 4, tutorRescheduled: 2, studentRescheduled: 1, operationsRescheduled: 1 },
    { scheduleDetailsId: "m2", rescheduledBy: "student", status: "Make-up (cancelled by Student)", totalRescheduled: 4, tutorRescheduled: 2, studentRescheduled: 1, operationsRescheduled: 1 },
    { scheduleDetailsId: "o1", rescheduledBy: "operations", status: "Class Re-Scheduled", totalRescheduled: 4, tutorRescheduled: 2, studentRescheduled: 1, operationsRescheduled: 1 },
  ],
  ...overrides,
});

const count = (label) => within(screen.getByTitle(label)).getByText(/^\d+$/).textContent;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem("userId", "test-user");
});

test.each([["Operations", Operations], ["Operations Admin", OperationsAdmin]])(
  "%s: cancellations count by who cancelled and make-ups add to Rescheduled under the original category",
  async (_, Dashboard) => {
    api.getCurrentOperationsDashboard.mockResolvedValue(dashboard());
    render(<Dashboard />);
    await screen.findByTitle("Cancelled by Tutor");

    expect(count("Cancelled by Tutor")).toBe("2");
    expect(count("Cancelled by Student")).toBe("1");
    expect(count("Cancelled by Operations")).toBe("1"); // one category per class: 2 + 1 + 1 = 4
    expect(screen.getByText("Cancelled classes").closest(".ops-stat")).toHaveTextContent(/^4/);
    // Total and breakdown come from the same range: tutor 2 (status + make-up), student 1, Operations 1 = 4.
    expect(count("Rescheduled by Tutor")).toBe("2");
    expect(count("Rescheduled by Student")).toBe("1");
    expect(count("Rescheduled by Operations")).toBe("1");
    const card = screen.getByText("Rescheduled").closest(".ops-stat");
    expect(card).toHaveTextContent(/^4/);
    expect(card).not.toHaveTextContent(/For /); // the date range, not a single date
  });

test("nothing re-scheduled in the range: total and breakdown are 0", async () => {
  api.getCurrentOperationsDashboard.mockResolvedValue(dashboard({ rescheduledInRange: [] }));
  render(<Operations />);
  await screen.findByTitle("Rescheduled by Tutor");
  expect(count("Rescheduled by Tutor")).toBe("0");
  expect(count("Rescheduled by Student")).toBe("0");
  expect(count("Rescheduled by Operations")).toBe("0");
  expect(screen.getByText("Rescheduled").closest(".ops-stat")).toHaveTextContent(/^0/);
});

test("if the range call failed, the card keeps its earlier single-date numbers", async () => {
  api.getCurrentOperationsDashboard.mockResolvedValue(dashboard({ rescheduledInRange: null }));
  render(<Operations />);
  await screen.findByTitle("Rescheduled by Tutor");
  expect(count("Rescheduled by Tutor")).toBe("1");
  expect(screen.queryByTitle("Rescheduled by Operations")).toBeNull();
  expect(screen.getByText("Rescheduled").closest(".ops-stat")).toHaveTextContent(/^1/);
});

test("the selected date range is passed to the dashboard query", async () => {
  api.getCurrentOperationsDashboard.mockResolvedValue(dashboard());
  render(<Operations />);
  await screen.findByTitle("Cancelled by Tutor");
  const [date, fromDate, toDate] = api.getCurrentOperationsDashboard.mock.calls[0];
  expect(date).toBe(toDate);
  expect(fromDate < toDate).toBe(true);
});
