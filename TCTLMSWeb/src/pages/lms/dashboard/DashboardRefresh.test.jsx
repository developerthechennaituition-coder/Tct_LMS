import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Operations from "./OperationsDashboard";
import OperationsAdmin from "./OperationsAdminDashboard";
import Coordinator from "./CoordinatorDashboard";
import CoordinatorAdmin from "./CoordinatorAdminDashboard";
import Admin from "./AdminDashboard";
import Accounts from "./AccountPayrollDashboard";
import AccountsAdmin from "./AccountsAdminDashboard";
import Payroll from "./PayrollAdminDashboard";
import HR from "./HRDashboard";
import Tutor from "./TutorDashboard";
import Student from "./StudentDashboard";
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
    "Tooltip", "XAxis", "YAxis", "Line", "LineChart", "Pie", "PieChart", "Cell"].map(name => [name, Box]));
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem("userId", "test-user");
  Object.values(api).filter(value => jest.isMockFunction(value)).forEach(fn => fn.mockResolvedValue({}));
});

test.each([
  ["Operations", Operations, "getCurrentOperationsDashboard"],
  ["Operations Admin", OperationsAdmin, "getCurrentOperationsDashboard"],
  ["Coordinator", Coordinator, "getCurrentCoordinatorDashboard"],
  ["Coordinator Admin", CoordinatorAdmin, "getCurrentCoordinatorAdminDashboard"],
  ["Admin", Admin, "getCurrentSuperAdminDashboard"],
  ["Accounts", Accounts, "getFinanceDashboard"],
  ["Accounts Admin", AccountsAdmin, "getFinanceDashboard"],
  ["Payroll Admin", Payroll, "getFinanceDashboard"],
  ["HR", HR, "getHrDashboard"],
])("%s applies dates only on Refresh and fetches again for the same range", async (_, Dashboard, method) => {
  render(<Dashboard />);
  const button = screen.getByRole("button", { name: "Refresh dashboard" });
  await waitFor(() => expect(button).not.toBeDisabled());
  expect(api[method]).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "01-09-2026" } });
  fireEvent.change(screen.getByLabelText("To date"), { target: { value: "30-09-2026" } });
  expect(api[method]).toHaveBeenCalledTimes(1);
  fireEvent.click(button);
  await waitFor(() => expect(api[method]).toHaveBeenCalledTimes(2));
  expect(api[method].mock.calls[1]).toEqual(method === "getCurrentOperationsDashboard"
    ? ["2026-09-30", "2026-09-01", "2026-09-30"] : ["2026-09-01", "2026-09-30"]);
  await waitFor(() => expect(button).not.toBeDisabled());
  expect(screen.getByLabelText("From date")).toHaveValue("01-09-2026");
  fireEvent.click(button);
  await waitFor(() => expect(api[method]).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(button).not.toBeDisabled());
});

test("failed dashboard fetch leaves date controls and a working retry", async () => {
  api.getCurrentOperationsDashboard.mockRejectedValueOnce(new Error("Test failure"));
  render(<Operations />);
  await screen.findByText("Test failure");
  const button = screen.getByRole("button", { name: "Refresh dashboard" });
  expect(button).not.toBeDisabled();
  fireEvent.click(button);
  await waitFor(() => expect(api.getCurrentOperationsDashboard).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByText("Test failure")).not.toBeInTheDocument());
});

test.each([["Tutor", Tutor, "getCurrentTutorDashboard"], ["Student", Student, "getCurrentStudentDashboard"]])(
  "%s refresh reloads its data without reloading the whole page", async (_, Dashboard, method) => {
    render(<Dashboard />);
    const button = screen.getByRole("button", { name: "Refresh dashboard" });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await waitFor(() => expect(api[method]).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(button).not.toBeDisabled());
  });
