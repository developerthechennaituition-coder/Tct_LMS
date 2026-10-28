import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PaymentPlanModal from "./PaymentPlanModal";
import * as api from "../../../apiservices/ScheduleService";
import { toast } from "react-toastify";

jest.mock("../../../apiservices/ScheduleService", () => ({
  getPaymentPlanBySalesDetails: jest.fn(), addOrUpdatePaymentPlan: jest.fn(), recordPayment: jest.fn(),
  createPrepaidUpfrontInvoice: jest.fn(), createPrepaidStatement: jest.fn(), checkPrepaidOverrun: jest.fn(),
}));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("../../../components/Component", () => ({
  Button: ({ children, color, size, outline, ...props }) => <button {...props}>{children}</button>, Icon: () => null,
}));
jest.mock("reactstrap", () => {
  const Wrap = ({ children }) => <div>{children}</div>;
  return { Modal: Wrap, ModalHeader: Wrap, ModalBody: Wrap, ModalFooter: Wrap, Row: Wrap, Col: Wrap,
    Table: ({ children }) => <table>{children}</table>, Spinner: () => <span>Loading</span> };
});

const course = { salesDetailsId: "enrollment", studentId: "student", subject: "Maths", month: 10, year: 2026 };
const plan = { id: "plan", planMonths: 3, startMonth: 9, startYear: 2026, totalClasses: 24,
  totalFee: 12000, installmentCount: 1, amountPaid: 12000, remainingAmount: 0, payments: [],
  completedClasses: 10, remainingClasses: 14, isLocked: true, upfrontInvoiceNumber: "INV-1" };

test.each([2,3,10])("new package preserves Coordinator's %s-month selection", async months => {
  api.getPaymentPlanBySalesDetails.mockResolvedValue(null);
  render(<PaymentPlanModal isOpen onClose={() => {}} course={{ ...course, scheduledPackageMonths: months, packageStartMonth: 9, packageStartYear: 2026 }} />);
  await screen.findByRole("button", { name: "Create Plan" });
  const duration = screen.getByRole("combobox", { name: "Package duration" });
  expect(duration.value).toBe(String(months));
  expect(duration.disabled).toBe(true);
  fireEvent.change(screen.getByRole("spinbutton", { name: "Total package fee" }), { target: { value: "12000" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Plan" }));
  expect(api.addOrUpdatePaymentPlan).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("entire package"));
});

beforeEach(() => { jest.clearAllMocks(); localStorage.setItem("userId", "accounts-user"); });

test("issued plan is locked but Accounts can still record payments and run monthly checks", async () => {
  api.getPaymentPlanBySalesDetails.mockResolvedValue(plan);
  render(<PaymentPlanModal isOpen onClose={() => {}} course={course} />);
  const update = await screen.findByRole("button", { name: "Update Plan" });
  expect(update.closest("fieldset").disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Add Payment" }).disabled).toBe(false);
  expect(screen.getByRole("button", { name: /Monthly Check/ }).disabled).toBe(false);
});

test("loading failure cannot silently create a replacement plan", async () => {
  api.getPaymentPlanBySalesDetails.mockRejectedValue(new Error("offline"));
  render(<PaymentPlanModal isOpen onClose={() => {}} course={course} />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Create Plan" }).closest("fieldset").disabled).toBe(true);
  expect(api.addOrUpdatePaymentPlan).not.toHaveBeenCalled();
});

test("API business failure is not mistaken for save success when data is present", async () => {
  api.getPaymentPlanBySalesDetails.mockResolvedValue(null);
  api.addOrUpdatePaymentPlan.mockResolvedValue({ succeeded: false, data: "00000000-0000-0000-0000-000000000000", message: "Plan is locked" });
  render(<PaymentPlanModal isOpen onClose={() => {}} course={course} />);
  await screen.findByRole("button", { name: "Create Plan" });
  fireEvent.change(screen.getAllByRole("spinbutton")[3], { target: { value: "12000" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Plan" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Plan is locked"));
  expect(toast.success).not.toHaveBeenCalled();
});

test("monthly invoice action uses the selected period and reloads package usage", async () => {
  api.getPaymentPlanBySalesDetails.mockResolvedValue(plan);
  api.createPrepaidStatement.mockResolvedValue({ success: true, invoiceNumber: "RECON-0" });
  render(<PaymentPlanModal isOpen onClose={() => {}} course={course} />);
  fireEvent.click(await screen.findByRole("button", { name: /Monthly Check/ }));
  await waitFor(() => expect(api.createPrepaidStatement).toHaveBeenCalledWith("student", expect.any(Number), expect.any(Number), "accounts-user"));
  await waitFor(() => expect(api.getPaymentPlanBySalesDetails).toHaveBeenCalledTimes(2));
});
