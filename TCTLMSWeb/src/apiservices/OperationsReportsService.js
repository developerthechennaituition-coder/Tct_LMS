import { axios } from "../library/axios";

// Read-only Operations Reports API (api/operations-reports, Operations role only).
const reportUrl = (path, parameters = {}) => {
  const params = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const query = params.toString();
  return `/operations-reports/${path}${query ? `?${query}` : ""}`;
};

export const getOperationsReportFilters = (signal) => axios.get(reportUrl("filters"), { signal });

export const getOperationsReportSummary = (report, filters, signal) =>
  axios.get(reportUrl(`${report}/summary`, filters), { signal });

// Returns { data: rows, totalRecords, page, pageSize }.
export const getOperationsReportView = (report, view, filters, signal) =>
  axios.get(reportUrl(`${report}/${view}`, filters), { signal });
