/* eslint-disable testing-library/no-node-access -- the sidebar marks the current page with a class on the <li> and
   orders items in the DOM; neither is reachable through Testing Library's role / text queries. */
import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";
import { GetMenuByUser } from "../../apiservices/AuthenticateService";
import { getMyTasks } from "../../apiservices/MyCalendarService";

jest.mock("../../apiservices/AuthenticateService", () => ({ GetMenuByUser: jest.fn() }));
jest.mock("../../apiservices/MyCalendarService", () => ({ getMyTasks: jest.fn() }));
jest.mock("simplebar-react", () => ({ children }) => <div>{children}</div>);

const ME = "11111111-0000-0000-0000-000000000001";
// The menu API returns Tasks (with its SortOrder position) only for roles granted it in Settings → Role Permission.
const tasksMenu = { text: "Tasks", link: "/lms/tasks", icon: "task", subMenu: [] };
const menuWithoutTasks = [
  { text: "Dashboard", link: "/", icon: "dashboard", subMenu: [] },
  { text: "Students", link: "/lms/students", icon: "users", subMenu: [] },
  { text: "Settings", link: "/lms/settings", icon: "setting", subMenu: [] },
];
const apiMenu = [...menuWithoutTasks.slice(0, 1), tasksMenu, ...menuWithoutTasks.slice(1)];

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const renderAt = async (url, role = "Coordinator", menu = apiMenu) => {
  window.history.pushState({}, "", url);
  localStorage.setItem("roleId", "1");
  localStorage.setItem("userRole", role);
  localStorage.setItem("userId", ME);
  GetMenuByUser.mockResolvedValue(menu);
  getMyTasks.mockResolvedValue({ data: [{ assignedToUserId: ME, status: "Pending" }, { assignedToUserId: ME, status: "Pending" }] });
  const view = render(<MemoryRouter><Sidebar fixed theme="white" /></MemoryRouter>);
  await settle();
  return view;
};

const item = (text) => screen.getByText(text, { selector: ".nk-menu-text" }).closest("li");
const menuTexts = () => [...document.querySelectorAll(".nk-menu > li > a .nk-menu-text")].map((e) => e.textContent);

describe("sidebar Tasks item", () => {
  beforeEach(() => jest.spyOn(console, "log").mockImplementation(() => {}));
  afterEach(() => {
    console.log.mockRestore();
    localStorage.clear();
  });

  test("sits right after My Calendar, links to the Tasks page, with the live count", async () => {
    await renderAt("/lms/students");
    expect(menuTexts()).toEqual(["Dashboard", "Students", "My Calendar", "Tasks", "Settings"]);
    expect(item("Tasks").querySelector("a")).toHaveAttribute("href", "/lms/tasks");
    expect(item("Tasks").querySelector(".nk-menu-badge")).toHaveTextContent("2");
    expect(item("My Calendar").querySelector(".nk-menu-badge")).toBeNull();
  });

  test("on the Tasks page only Tasks is highlighted", async () => {
    await renderAt("/lms/tasks?list=verification");
    expect(item("Tasks")).toHaveClass("active");
    expect(item("My Calendar")).not.toHaveClass("active");
  });

  test("on My Calendar only My Calendar is highlighted", async () => {
    await renderAt("/lms/my-calendar");
    expect(item("My Calendar")).toHaveClass("active");
    expect(item("Tasks")).not.toHaveClass("active");
  });

  test("other items keep their highlight", async () => {
    await renderAt("/lms/students");
    expect(item("Students")).toHaveClass("active");
    expect(item("Tasks")).not.toHaveClass("active");
  });

  test("follows My Calendar into a submenu when the API sends it there", async () => {
    const nested = [
      { text: "Work", link: "", icon: "grid", subMenu: [{ text: "My Calendar", link: "/lms/my-calendar", icon: "calendar", subMenu: [] }] },
      tasksMenu,
    ];
    await renderAt("/lms/students", "Coordinator", nested);
    const subTexts = [...document.querySelectorAll(".nk-menu-sub .nk-menu-text")].map((e) => e.textContent);
    expect(subTexts).toEqual(["My Calendar", "Tasks"]);
  });

  test("not shown when the role does not have the Tasks permission (and no count is loaded)", async () => {
    await renderAt("/lms/students", "Coordinator", menuWithoutTasks);
    expect(menuTexts()).toEqual(["Dashboard", "Students", "My Calendar", "Settings"]);
    expect(screen.queryByText("Tasks")).toBeNull();
    expect(getMyTasks).not.toHaveBeenCalled();
  });

  test("granted Tasks is moved from its menu position to right after My Calendar, once", async () => {
    await renderAt("/lms/students");
    expect(menuTexts().filter((t) => t === "Tasks")).toHaveLength(1);
    expect(menuTexts().indexOf("Tasks")).toBe(menuTexts().indexOf("My Calendar") + 1);
  });

  test.each(["Tutor", "Student"])("not shown for %s (no My Calendar)", async (role) => {
    await renderAt("/", role, menuWithoutTasks);
    expect(screen.queryByText("Tasks")).toBeNull();
    expect(getMyTasks).not.toHaveBeenCalled();
  });
});
