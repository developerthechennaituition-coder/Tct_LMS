import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import TutorAssignmentPopup from "./TutorAssignmentPopup";
import { updateStatus } from "../../../apiservices/StudentEnrollmentService";
import { GetSalesDetails } from "../../../apiservices/NofiticationService";
import { getTutorsByAvailability, getUserAvailability } from "../../../apiservices/UserService";
import { getPaymentPercentage } from "../../../apiservices/TutorService";
import { toast } from "react-toastify";

jest.mock("../../../apiservices/StudentEnrollmentService", () => ({ updateStatus: jest.fn() }));
jest.mock("../../../apiservices/NofiticationService", () => ({ GetSalesDetails: jest.fn() }));
jest.mock("../../../apiservices/UserService", () => ({ getTutorsByAvailability: jest.fn(), getUserAvailability: jest.fn() }));
jest.mock("../../../apiservices/TutorService", () => ({ getPaymentPercentage: jest.fn() }));
jest.mock("../tutors/TutorInfo", () => () => null);
jest.mock("./TutorAvailabilityModal", () => () => null);
jest.mock("react-toastify", () => ({ ToastContainer: () => null, toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../../utils/Utils", () => ({ UUIDNill: () => "empty", FollowUpStatus: { DemoPendingTutorAssignedNotApproved: 20012 } }));
jest.mock("react-hook-form", () => {
  const register = jest.fn(() => () => {});
  const setValue = jest.fn();
  return { useForm: () => ({ register, setValue, errors: {}, setError: jest.fn(), clearErrors: jest.fn(),
    handleSubmit: callback => event => { event.preventDefault(); callback({ noteText: "Assign for demo", tutorPayment: 250 }); } }) };
});
jest.mock("../../../components/Component", () => ({
  Row: ({ children }) => <div>{children}</div>, Col: ({ children }) => <div>{children}</div>, Icon: () => null,
  RSelect: () => <span>Tutor choice</span>, TooltipComponent: () => null,
}));
jest.mock("reactstrap", () => {
  const Wrap = ({ children }) => <div>{children}</div>;
  return { Modal: Wrap, ModalBody: Wrap, ModalHeader: Wrap, ModalFooter: Wrap, FormGroup: Wrap,
    Form: ({ children, onSubmit }) => <form onSubmit={onSubmit}>{children}</form>,
    Button: ({ children, color, size, ...props }) => <button {...props}>{children}</button>,
    Spinner: () => null, UncontrolledPopover: () => null, PopoverHeader: Wrap, PopoverBody: Wrap };
});

const close = jest.fn();
function open() {
  return render(<TutorAssignmentPopup isTabContent modalOpen modalStateChange={close}
    dataItem={{ stdUserId: "student", salesId: "sale", saleDetailsId: "enrollment", subjectId: "subject" }}
    selectedTutor={{ tutorId: "tutor", userId: "tutor-user" }} statusList={[{ code: 20012, id: "status" }]} />);
}
beforeEach(() => {
  jest.clearAllMocks();
  getTutorsByAvailability.mockResolvedValue({ succeeded: true, data: [] });
  GetSalesDetails.mockResolvedValue({ succeeded: true, data: { tutorId: "tutor", tutorUserId: "tutor-user", tutorPayment: 250, parentPayment: 500 } });
  getPaymentPercentage.mockResolvedValue({ tutorPercentage: 50, tutorPayment: 250 });
  getUserAvailability.mockResolvedValue([{ day: "Monday" }]);
});
async function saveButton() {
  const button = screen.getByRole("button", { name: "Save" });
  await waitFor(() => expect(button.disabled).toBe(false));
  return button;
}
test("a business failure keeps the dialog open and never reports success", async () => {
  updateStatus.mockResolvedValue({ succeeded: false, message: "Assignment rejected" });
  open(); fireEvent.click(await saveButton());
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Assignment rejected", expect.anything()));
  expect(toast.success).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Save" }).disabled).toBe(false);
});
test("pending save prevents duplicate submission and closes only after confirmed success", async () => {
  let resolveSave;
  updateStatus.mockReturnValue(new Promise(resolve => { resolveSave = resolve; }));
  const { container } = open();
  fireEvent.click(await saveButton());
  fireEvent.submit(container.querySelector("form"));
  expect(updateStatus).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
  await act(async () => resolveSave({ succeeded: true }));
  expect(toast.success).toHaveBeenCalledTimes(1); expect(close).toHaveBeenCalledWith(false);
});
test("network failure clears saving state without claiming success", async () => {
  updateStatus.mockRejectedValue(new Error("Network interrupted"));
  open(); fireEvent.click(await saveButton());
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(close).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Save" }).disabled).toBe(false);
});
test("failed initialization blocks saving incomplete assignment data", async () => {
  GetSalesDetails.mockRejectedValue(new Error("Load failed"));
  open();
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "Save" }).disabled).toBe(true);
  expect(updateStatus).not.toHaveBeenCalled();
});
