/* eslint-disable testing-library/no-node-access -- the submenu link is read from the item's <a>. */
import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";
import { GetMenuByUser } from "../../apiservices/AuthenticateService";
import { getMyTasks } from "../../apiservices/MyCalendarService";

jest.mock("../../apiservices/AuthenticateService", () => ({ GetMenuByUser: jest.fn() }));
jest.mock("../../apiservices/MyCalendarService", () => ({ getMyTasks: jest.fn() }));
jest.mock("simplebar-react", () => ({ children }) => <div>{children}</div>);

// The Invoice menu as the menu API returns it (Menu rows 27–29).
const invoiceMenu = {
  text: "Invoice",
  link: "",
  icon: "file-docs",
  subMenu: [
    { text: "Student Invoice", link: "/tct-student-invoice-list", subMenu: [] },
    { text: "Tutor Invoice", link: "/tct-tutor-invoice-list", subMenu: [] },
  ],
};

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const renderFor = async (role) => {
  localStorage.setItem("roleId", "1");
  localStorage.setItem("userRole", role);
  localStorage.setItem("userId", "11111111-0000-0000-0000-000000000001");
  GetMenuByUser.mockResolvedValue([invoiceMenu]);
  getMyTasks.mockResolvedValue({ data: [] });
  render(<MemoryRouter><Sidebar fixed theme="white" /></MemoryRouter>);
  await settle();
};

const menuLink = (text) => screen.getByText(text, { selector: ".nk-menu-text" }).closest("a");

describe("sidebar Invoice submenu label", () => {
  beforeEach(() => jest.spyOn(console, "log").mockImplementation(() => {}));
  afterEach(() => {
    console.log.mockRestore();
    localStorage.clear();
  });

  test("Tutor: 'Tutor Invoice' reads 'Salary Slip' and keeps the same link; parent and siblings unchanged", async () => {
    await renderFor("Tutor");
    expect(screen.getByText("Invoice", { selector: ".nk-menu-text" })).toBeInTheDocument();
    expect(menuLink("Salary Slip")).toHaveAttribute("href", "/tct-tutor-invoice-list");
    expect(screen.queryByText("Tutor Invoice", { selector: ".nk-menu-text" })).not.toBeInTheDocument();
    expect(menuLink("Student Invoice")).toHaveAttribute("href", "/tct-student-invoice-list");
  });

  test.each(["SuperAdmin", "AccountsAdmin", "Payroll"])("%s: still reads 'Tutor Invoice'", async (role) => {
    await renderFor(role);
    expect(menuLink("Tutor Invoice")).toHaveAttribute("href", "/tct-tutor-invoice-list");
    expect(screen.queryByText("Salary Slip", { selector: ".nk-menu-text" })).not.toBeInTheDocument();
  });
});
