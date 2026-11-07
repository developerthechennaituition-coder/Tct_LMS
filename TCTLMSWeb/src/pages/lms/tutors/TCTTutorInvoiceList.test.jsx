import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TCTTutorInvoiceList from "./TCTTutorInvoiceList";
import { gettutorpayrolllist } from "../../../apiservices/ScheduleService";

jest.mock("../../../apiservices/ScheduleService", () => ({ gettutorpayrolllist: jest.fn() }));
// Same approach as TCTTutorPayroll.test.jsx: the shared component barrel pulls in an ES-module stylesheet Jest
// cannot parse, so its layout pieces are plain wrappers here (the page's own text is what is tested).
jest.mock("../../../components/Component", () => {
  const Wrap = ({ children }) => <div>{children}</div>;
  return {
    Button: Wrap, Block: Wrap, BlockBetween: Wrap, BlockDes: Wrap, BlockHead: Wrap, BlockHeadContent: Wrap, BlockTitle: Wrap,
    Icon: () => null, PaginationComponent: () => null,
  };
});
jest.mock("../../../layout/content/Content", () => ({ children }) => <div>{children}</div>);
jest.mock("../../../layout/head/Head", () => () => null);

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const renderAs = async (role) => {
  localStorage.setItem("userId", "11111111-0000-0000-0000-000000000001");
  localStorage.setItem("userName", "Abhay A");
  localStorage.setItem("userRole", role);
  gettutorpayrolllist.mockResolvedValue({ data: [] });
  render(<MemoryRouter><TCTTutorInvoiceList /></MemoryRouter>);
  await settle();
};

afterEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
});

test("Tutor sees salary slip wording; the same list is loaded", async () => {
  await renderAs("Tutor");
  expect(screen.getByText("Abhay A's Salary Slips")).toBeInTheDocument();
  expect(screen.getByText("You have total 0 salary slips.")).toBeInTheDocument();
  expect(screen.getByText("All Salary Slips")).toBeInTheDocument();
  expect(screen.queryByText(/Invoices/)).not.toBeInTheDocument();
  expect(gettutorpayrolllist).toHaveBeenCalledWith("11111111-0000-0000-0000-000000000001");
});

test.each(["SuperAdmin", "AccountsAdmin", "Payroll"])("%s keeps the invoice wording", async (role) => {
  await renderAs(role);
  expect(screen.getByText("Abhay A's Invoices")).toBeInTheDocument();
  expect(screen.getByText("You have total 0 invoices.")).toBeInTheDocument();
  expect(screen.getByText("All Invoices")).toBeInTheDocument();
  expect(screen.queryByText(/Salary Slip/i)).not.toBeInTheDocument();
});
