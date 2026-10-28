import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { displayFilterDate, parseFilterDate, toDateOnly } from "../../../library/dashboardDates";
import "./DashboardDateRange.css";

// Draft dates stay local: browsing a month or editing a field must not fetch
// data or unmount the open calendar. Refresh explicitly applies both dates.
export default function DashboardDateRange({ fromDate, toDate, onRefresh, loading = false }) {
  const [from, setFrom] = useState(() => displayFilterDate(fromDate));
  const [to, setTo] = useState(() => displayFilterDate(toDate));
  const [error, setError] = useState("");
  const apply = (event) => {
    event.preventDefault();
    if (loading) return;
    const start = parseFilterDate(from);
    const end = parseFilterDate(to);
    if (!start || !end) {
      setError("Enter both dates in DD-MM-YYYY format.");
      return;
    }
    if (start > end) {
      setError("From date must be on or before To date.");
      return;
    }
    setError("");
    onRefresh({ fromDate: toDateOnly(start), toDate: toDateOnly(end) });
  };
  const field = (label, id, value, setValue) => (
    <div>
      <label className="form-label mb-1 small text-soft" htmlFor={id}>{label}</label>
      <DatePicker
        id={id}
        className="form-control"
        selected={parseFilterDate(value)}
        value={value}
        dateFormat="dd-MM-yyyy"
        strictParsing
        placeholderText="DD-MM-YYYY"
        autoComplete="off"
        disabled={loading}
        onChange={(date) => { setValue(date ? displayFilterDate(toDateOnly(date)) : ""); setError(""); }}
        onChangeRaw={(event) => {
          if (typeof event?.target?.value === "string") { setValue(event.target.value); setError(""); }
        }}
        popperClassName="dashboard-date-popper"
          popperPlacement="bottom-start"
        renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
          <div className="dashboard-calendar-header">
            <button type="button" className="btn btn-sm btn-light" aria-label={`Previous month (${label})`} onClick={decreaseMonth}>‹</button>
            <span aria-live="polite">{date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
            <button type="button" className="btn btn-sm btn-light" aria-label={`Next month (${label})`} onClick={increaseMonth}>›</button>
          </div>
        )}
      />
    </div>
  );
  return (
    <form className="dashboard-date-range" onSubmit={apply} noValidate aria-label="Dashboard date filters">
      <div className="d-flex flex-wrap align-items-end" style={{ gap: "0.5rem" }}>
        {field("From date", "dashboard-from-date", from, setFrom)}
        {field("To date", "dashboard-to-date", to, setTo)}
        <button type="submit" className="btn btn-outline-primary" disabled={loading} aria-label="Refresh dashboard" aria-busy={loading}>
          <span className={loading ? "spinner-border spinner-border-sm mr-2" : "icon ni ni-reload mr-2"} aria-hidden="true" />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {error && <div role="alert" className="text-danger small mt-1">{error}</div>}
      {!error && (from !== displayFilterDate(fromDate) || to !== displayFilterDate(toDate)) &&
        <div className="text-soft small mt-1">Click Refresh to apply the selected dates.</div>}
    </form>
  );
}
