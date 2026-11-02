import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Switch, useLocation } from "react-router-dom";
import MyCalendar, { MyTasks } from "./MyCalendar";
import * as api from "../../../apiservices/MyCalendarService";

jest.mock("../../../apiservices/MyCalendarService", () => ({
  ...Object.fromEntries(
    ["getMyCalendarDemos", "getMyCalendarClasses", "getMyCalendarFollowUps", "getDemoStatusOptions", "getDemoStatus",
      "updateDemoStatus", "getTaskAssignees", "getMyTasks", "createUserTask", "completeUserTask", "startUserTask",
      "getPendingVerificationTasks", "submitTaskForVerification", "verifyUserTask", "requestUserTaskChanges",
      "downloadTaskAttachment"].map((name) => [name, jest.fn()])
  ),
  myCalendarErrorMessage: (_error, fallback) => fallback,
}));
jest.mock("../../../components/partials/calender/Calender", () => () => <div>Demo calendar grid</div>);
jest.mock("../../../layout/content/Content", () => ({ children }) => <div>{children}</div>);
// Other services reached through shared imports (timezone labels) are not called by these screens.
jest.mock("../../../library/axios", () => ({ axios: { get: jest.fn(() => Promise.resolve({})) } }));
// The component barrel pulls in components/preview/Preview.js, which Jest cannot parse (also why App.test.js fails).
jest.mock("../../../components/Component", () => ({
  Block: ({ children }) => <div>{children}</div>,
  Icon: ({ name }) => <em className={`icon ni ni-${name}`} />,
}));
jest.mock("../../../layout/head/Head", () => () => null);

const ME = "11111111-0000-0000-0000-000000000001";
const Where = () => {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
};
const settle = async () => {
  for (let i = 0; i < 8; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const renderAt = async (url, role = "Coordinator") => {
  localStorage.setItem("userRole", role);
  localStorage.setItem("userId", ME);
  api.getTaskAssignees.mockResolvedValue({ data: [] });
  api.getMyTasks.mockResolvedValue({
    data: [
      { id: "t1", title: "Prepare report", description: "d", assignedToUserId: ME, assignedByUserId: "x", status: "Pending", verificationStatus: "Assigned", dueDate: "2099-01-01T00:00:00" },
      { id: "t2", title: "Given task", description: "d", assignedToUserId: "y", assignedByUserId: ME, status: "Pending", verificationStatus: "Assigned", dueDate: "2099-01-01T00:00:00" },
    ],
  });
  api.getPendingVerificationTasks.mockResolvedValue({ data: [] });
  [api.getMyCalendarDemos, api.getMyCalendarClasses, api.getMyCalendarFollowUps, api.getDemoStatusOptions].forEach((f) => f.mockResolvedValue({ data: [] }));
  render(
    <MemoryRouter initialEntries={[url]}>
      <Switch>
        <Route exact path="/lms/my-calendar" component={MyCalendar} />
        <Route exact path="/lms/tasks" component={MyTasks} />
      </Switch>
      <Where />
    </MemoryRouter>
  );
  await settle();
};

describe("Tasks page", () => {
  afterEach(() => localStorage.clear());

  test("shows the task panel without the My Calendar heading or Demo Calendar tab", async () => {
    await renderAt("/lms/tasks");
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.queryByText("My Calendar")).toBeNull();
    expect(screen.queryByText("Demo Calendar")).toBeNull();
    expect(screen.getByText("Assign a task")).toBeInTheDocument();
    ["Assigned to me", "Assigned by me", "Pending Verification", "My Task", "Critical"].forEach((name) =>
      expect(screen.getByRole("tab", { name: new RegExp(name) })).toBeInTheDocument()
    );
    expect(screen.getByText("Prepare report")).toBeInTheDocument();
    expect(api.getMyTasks).toHaveBeenCalledTimes(1);
  });

  test("?list= opens that list, as before", async () => {
    await renderAt("/lms/tasks?list=given");
    expect(screen.getByRole("tab", { name: /Assigned by me/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Given task")).toBeInTheDocument();
  });

  test("old My Calendar task links redirect to the Tasks page with their list", async () => {
    await renderAt("/lms/my-calendar?tab=tasks&list=verification");
    expect(screen.getByTestId("where")).toHaveTextContent("/lms/tasks?list=verification");
    expect(screen.getByRole("tab", { name: /Pending Verification/ })).toHaveAttribute("aria-selected", "true");
  });

  test("My Calendar shows only the Demo Calendar (no Tasks tab) and does not load tasks", async () => {
    await renderAt("/lms/my-calendar");
    expect(screen.getByRole("heading", { name: "My Calendar" })).toBeInTheDocument();
    expect(screen.getByText("Demo calendar grid")).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent.trim())).toEqual(["Demo Calendar"]);
    expect(screen.queryByText("Assign a task")).toBeNull();
    expect(api.getMyTasks).not.toHaveBeenCalled();
    expect(screen.getByTestId("where")).toHaveTextContent("/lms/my-calendar");
  });

  test("old ?tab=tasks link without a list still opens the Tasks page", async () => {
    await renderAt("/lms/my-calendar?tab=tasks");
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/lms\/tasks$/);
    expect(screen.getByRole("tab", { name: /Assigned to me/ })).toHaveAttribute("aria-selected", "true");
  });

  test.each(["Tutor", "Student"])("not available for %s", async (role) => {
    await renderAt("/lms/tasks", role);
    expect(screen.getByText("Tasks are not available for your role.")).toBeInTheDocument();
    expect(api.getMyTasks).not.toHaveBeenCalled();
  });
});
