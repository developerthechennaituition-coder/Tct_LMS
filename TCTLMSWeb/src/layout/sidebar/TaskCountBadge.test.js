import React from "react";
import { act, render, screen } from "@testing-library/react";
import TaskCountBadge from "./TaskCountBadge";
import { getMyTasks } from "../../apiservices/MyCalendarService";
import { openAssignedTaskCount, publishTaskCount } from "../../library/myCalendarTasks";

jest.mock("../../apiservices/MyCalendarService", () => ({ getMyTasks: jest.fn() }));

const ME = "AAAA0000-0000-0000-0000-000000000001";
const OTHER = "bbbb0000-0000-0000-0000-000000000002";
const task = (assignedToUserId, status = "Pending") => ({ assignedToUserId, assignedByUserId: OTHER, status });

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

describe("Assigned to me count", () => {
  test("own tasks that are not completed (any id case); tasks I assigned and completed ones are left out", () => {
    const tasks = [task(ME.toLowerCase()), task(ME, "Pending"), task(ME, "Completed"), task(OTHER)];
    expect(openAssignedTaskCount(tasks, ME)).toBe(2);
    expect(openAssignedTaskCount(null, ME)).toBe(0);
  });
});

describe("sidebar Tasks badge", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.setItem("userId", ME);
    getMyTasks.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  test("loads the count from the existing tasks API on start (page refresh)", async () => {
    getMyTasks.mockResolvedValue({ data: [task(ME), task(ME), task(ME, "Completed"), task(OTHER)] });
    render(<TaskCountBadge />);
    await settle();
    expect(getMyTasks).toHaveBeenCalledTimes(1);
    expect(screen.getByText("2")).toHaveClass("nk-menu-badge");
  });

  test("hidden when there are no open tasks", async () => {
    getMyTasks.mockResolvedValue({ data: [task(ME, "Completed")] });
    const { container } = render(<TaskCountBadge />);
    await settle();
    expect(container).toBeEmptyDOMElement();
  });

  test("takes the count from the Tasks page without calling the API again", async () => {
    getMyTasks.mockResolvedValue({ data: [task(ME)] });
    render(<TaskCountBadge />);
    await settle();
    act(() => publishTaskCount(3));
    expect(screen.getByText("3")).toBeInTheDocument();
    act(() => publishTaskCount(0)); // e.g. the last task was submitted for verification
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    act(() => window.dispatchEvent(new Event("focus"))); // count is fresh: no extra request
    expect(getMyTasks).toHaveBeenCalledTimes(1);
  });

  test("refreshes on a timer, so tasks assigned by someone else appear", async () => {
    getMyTasks.mockResolvedValueOnce({ data: [task(ME)] }).mockResolvedValueOnce({ data: [task(ME), task(ME)] });
    render(<TaskCountBadge />);
    await settle();
    expect(screen.getByText("1")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(60 * 1000));
    await settle();
    expect(getMyTasks).toHaveBeenCalledTimes(2);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("keeps the last count when a refresh fails", async () => {
    getMyTasks.mockResolvedValueOnce({ data: [task(ME)] }).mockRejectedValueOnce(new Error("offline"));
    render(<TaskCountBadge />);
    await settle();
    act(() => jest.advanceTimersByTime(60 * 1000));
    await settle();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("shows 99+ for large counts", async () => {
    getMyTasks.mockResolvedValue({ data: Array.from({ length: 120 }, () => task(ME)) });
    render(<TaskCountBadge />);
    await settle();
    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});
