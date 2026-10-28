import { axios } from "../library/axios";
import { getCurrentOperationsDashboard, getCurrentCoordinatorDashboard, getFinanceDashboard } from "./DashboardService";

jest.mock("../library/axios", () => ({ axios: { get: jest.fn() } }));
beforeEach(() => {
  jest.clearAllMocks();
  axios.get.mockResolvedValue({ data: [] });
  localStorage.setItem("userId", "test-user");
});

test.each([
  ["2026-10-01", "2026-09-30"],
  ["2026-01-01", "2025-12-31"],
  ["2024-03-01", "2024-02-29"],
])("Operations uses the actual previous calendar day for %s", async (date, previous) => {
  const result = await getCurrentOperationsDashboard(date, "2026-01-01", date);
  expect(result.dMinusOne).toBe(previous);
  const urls = axios.get.mock.calls.map(([url]) => url);
  expect(urls.some(url => url.includes(`alerts/missed-attendance?date=${previous}`))).toBe(true);
  expect(urls.some(url => url.includes(`mismatch/student?fromDate=2026-01-01&toDate=${date}`))).toBe(true);
});

test.each([
  ["Coordinator", getCurrentCoordinatorDashboard],
  ["Finance", getFinanceDashboard],
])("%s forwards selected dates and repeats HTTP requests on refresh", async (_, load) => {
  await load("2026-08-30", "2026-10-30");
  const firstCount = axios.get.mock.calls.length;
  expect(axios.get.mock.calls.some(([url]) => url.includes("fromDate=2026-08-30&toDate=2026-10-30"))).toBe(true);
  await load("2026-08-30", "2026-10-30");
  expect(axios.get).toHaveBeenCalledTimes(firstCount * 2);
});
