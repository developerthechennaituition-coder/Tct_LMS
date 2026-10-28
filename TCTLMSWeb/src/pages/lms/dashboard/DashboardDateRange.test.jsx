import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import DashboardDateRange from "./DashboardDateRange";
import { parseDateOnly, toDateOnly } from "../../../library/dashboardDates";

const setup = (props = {}) => {
  const onRefresh = jest.fn();
  const view = render(<DashboardDateRange fromDate="2026-10-01" toDate="2026-10-31" onRefresh={onRefresh} {...props} />);
  return { onRefresh, ...view };
};

afterEach(async () => { await act(async () => {}); });

test.each(["From date", "To date"])("%s calendar navigates both ways without applying or closing", (label) => {
  const { onRefresh, container } = setup();
  fireEvent.click(screen.getByLabelText(label));
  expect(container.querySelector(".react-datepicker-popper")).toHaveClass("dashboard-date-popper");
  fireEvent.click(screen.getByRole("button", { name: `Previous month (${label})` }));
  expect(screen.getByText("September 2026")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: `Next month (${label})` }));
  expect(screen.getByText("October 2026")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: `Next month (${label})` }));
  expect(screen.getByText("November 2026")).toBeInTheDocument();
  expect(onRefresh).not.toHaveBeenCalled();
});

test("calendar crosses a year boundary and selecting a day only changes the draft", () => {
  const { onRefresh, container } = setup({ fromDate: "2026-01-01" });
  fireEvent.click(screen.getByLabelText("From date"));
  fireEvent.click(screen.getByRole("button", { name: "Previous month (From date)" }));
  expect(screen.getByText("December 2025")).toBeInTheDocument();
  fireEvent.click(container.querySelector(".react-datepicker__day--015:not(.react-datepicker__day--outside-month)"));
  expect(screen.getByLabelText("From date")).toHaveValue("15-12-2025");
  expect(onRefresh).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
  expect(onRefresh).toHaveBeenCalledWith({ fromDate: "2025-12-15", toDate: "2026-10-31" });
});

test("Refresh applies both dates together and works again for an unchanged range", () => {
  const { onRefresh } = setup();
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "30-08-2026" } });
  fireEvent.change(screen.getByLabelText("To date"), { target: { value: "30-10-2026" } });
  expect(onRefresh).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
  fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
  expect(onRefresh).toHaveBeenCalledTimes(2);
  expect(onRefresh).toHaveBeenLastCalledWith({ fromDate: "2026-08-30", toDate: "2026-10-30" });
});

test.each(["", "31-02-2026", "garbage", "2026-10-01"])("invalid date %s never submits a stale value", (value) => {
  const { onRefresh } = setup();
  fireEvent.change(screen.getByLabelText("From date"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
  expect(onRefresh).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("Enter both dates");
});

test("reversed range is rejected; equal dates are allowed", () => {
  const { onRefresh } = setup();
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "01-11-2026" } });
  fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
  expect(screen.getByRole("alert")).toHaveTextContent("on or before");
  expect(onRefresh).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("To date"), { target: { value: "01-11-2026" } });
  fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
  expect(onRefresh).toHaveBeenCalledWith({ fromDate: "2026-11-01", toDate: "2026-11-01" });
});

test("loading disables refresh without removing the dates, then allows retry", () => {
  const { onRefresh, rerender } = setup({ loading: true });
  expect(screen.getByRole("button", { name: "Refresh dashboard" })).toBeDisabled();
  expect(screen.getByLabelText("From date")).toHaveValue("01-10-2026");
  fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
  expect(onRefresh).not.toHaveBeenCalled();
  rerender(<DashboardDateRange fromDate="2026-10-01" toDate="2026-10-31" onRefresh={onRefresh} loading={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
  expect(onRefresh).toHaveBeenCalledTimes(1);
});

test("calendar date formatting uses local fields rather than UTC conversion", () => {
  const midnight = new Date(2026, 9, 1);
  midnight.toISOString = () => "2026-09-30T18:30:00.000Z";
  expect(toDateOnly(midnight)).toBe("2026-10-01");
  expect(toDateOnly(parseDateOnly("2024-02-29"))).toBe("2024-02-29");
  expect(parseDateOnly("2026-02-29")).toBeNull();
});
