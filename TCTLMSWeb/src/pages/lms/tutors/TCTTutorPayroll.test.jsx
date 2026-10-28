import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TCTTutorPayroll from "./TCTTutorPayroll";
import { gettutorpayroll } from "../../../apiservices/ScheduleService";
import { generateTutorInvoice } from "../../../apiservices/TutorService";

jest.mock("../../../apiservices/ScheduleService", () => ({ gettutorpayroll: jest.fn() }));
jest.mock("../../../apiservices/TutorService", () => ({ generateTutorInvoice: jest.fn() }));
jest.mock("react-toastify", () => ({ ToastContainer: () => null, toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("react-router-dom", () => ({ Link: ({children, to}) => <a href={to}>{children}</a> }));
jest.mock("../../../layout/content/Content", () => ({children}) => <div>{children}</div>);
jest.mock("../../../layout/head/Head", () => () => null);
jest.mock("../../../components/Component", () => {
  const Wrap = ({children}) => <div>{children}</div>;
  return { Block: Wrap, BlockHead: Wrap, BlockTitle: Wrap,
    ReactDataTable: ({data, columns}) => <div>{data.map(row => <section key={row.tutorId}>
      {columns.map((column, index) => <div key={index}>{column.cell ? column.cell(row) : column.selector(row)}</div>)}
    </section>)}</div> };
});
const row = (index, status = "Pending") => ({ tutorId: `t${index}`, tutorName: `Tutor ${index}`, userCode: `T${index}`,
  payrollStatus: status, scheduleMonthName: "October", scheduleYear: 2026, noOfDaysPresent: status === "No classes taken" ? 0 : 1,
  approved: 1, isInvoiceGenerated: status === "Processed", invoiceNumber: status === "Processed" ? "INV-SAVED" : null });
beforeEach(() => jest.clearAllMocks());

test("passes all tutors to pagination, including tutors after the first ten", async () => {
  gettutorpayroll.mockResolvedValue({succeeded: true, data: Array.from({length: 15}, (_, i) => row(i))});
  render(<TCTTutorPayroll />);
  expect(await screen.findByText("Tutor 14 (T14)")).toBeTruthy();
});
test("status filters distinguish no classes, pending and processed and block invalid generation", async () => {
  gettutorpayroll.mockResolvedValue({succeeded: true, data: [row(1, "No classes taken"), row(2), row(3, "Processed")]});
  render(<TCTTutorPayroll />);
  await screen.findByText("Tutor 3 (T3)");
  expect(screen.getAllByRole("button", {name: "Generate Payslip"})).toHaveLength(1);
  fireEvent.change(screen.getByLabelText("Payroll status"), {target:{value:"Processed"}});
  expect(screen.queryByText("Tutor 2 (T2)")).toBeNull();
  expect(screen.getByText(/View Payslip INV-SAVED/)).toBeTruthy();
});
test("late response from previous month cannot replace the selected month's results", async () => {
  let resolveOld;
  gettutorpayroll.mockImplementationOnce(() => new Promise(resolve => {resolveOld = resolve;}))
    .mockResolvedValueOnce({succeeded:true, data:[row(2)]});
  render(<TCTTutorPayroll />);
  fireEvent.click(screen.getByLabelText("Next month"));
  await screen.findByText("Tutor 2 (T2)");
  resolveOld({succeeded:true, data:[row(1)]});
  await waitFor(() => expect(screen.queryByText("Tutor 1 (T1)")).toBeNull());
  expect(screen.getByText("Tutor 2 (T2)")).toBeTruthy();
});
test("business failure shows an error with retry, not no-classes results", async () => {
  gettutorpayroll.mockResolvedValue({succeeded:false,message:"Payroll unavailable"});
  render(<TCTTutorPayroll />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Payroll unavailable");
});
test("year boundary navigation requests the correct new month and year", async () => {
  gettutorpayroll.mockResolvedValue({succeeded:true,data:[]});
  render(<TCTTutorPayroll />);
  const month = new Date().getMonth() + 1, year = new Date().getFullYear();
  await waitFor(() => expect(gettutorpayroll).toHaveBeenCalledWith(month, year));
  for (let i = month; i <= 12; i++) fireEvent.click(screen.getByLabelText("Next month"));
  await waitFor(() => expect(gettutorpayroll).toHaveBeenLastCalledWith(1, year + 1));
});
test("pending payroll sends selected tutor and period once", async () => {
  gettutorpayroll.mockResolvedValue({succeeded:true,data:[row(2)]});
  generateTutorInvoice.mockImplementation(() => new Promise(() => {}));
  render(<TCTTutorPayroll />);
  const button = await screen.findByRole("button", {name:"Generate Payslip"});
  fireEvent.click(button); fireEvent.click(button);
  expect(generateTutorInvoice).toHaveBeenCalledTimes(1);
  expect(generateTutorInvoice).toHaveBeenCalledWith(expect.objectContaining({tutorId:"t2",inputMonth:new Date().getMonth()+1,inputYear:new Date().getFullYear()}));
});
