import { axios } from "../library/axios";

// Read-only Accounts Reports API (api/accounts-reports; each report needs its Role Permission).
const reportUrl = (path, parameters = {}) => {
  const params = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const query = params.toString();
  return `/accounts-reports/${path}${query ? `?${query}` : ""}`;
};

export const getAccountsReportFilters = (signal) => axios.get(reportUrl("filters"), { signal });

export const getAccountsReportSummary = (report, filters, signal) =>
  axios.get(reportUrl(`${report}/summary`, filters), { signal });

// Returns { data: rows, totalRecords, page, pageSize }.
export const getAccountsReportView = (report, view, filters, signal) =>
  axios.get(reportUrl(`${report}/${view}`, filters), { signal });
