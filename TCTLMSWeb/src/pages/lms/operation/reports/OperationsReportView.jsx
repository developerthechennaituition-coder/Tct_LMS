import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import moment from "moment";
import Select from "react-select";
import { Alert, Spinner, Table } from "reactstrap";
import Head from "../../../../layout/head/Head";
import Content from "../../../../layout/content/Content";
import { BlockHead, BlockHeadContent, BlockTitle, Icon } from "../../../../components/Component";
import { toDateOnly } from "../../../../library/dashboardDates";
import {
  getOperationsReportFilters,
  getOperationsReportSummary,
  getOperationsReportView,
} from "../../../../apiservices/OperationsReportsService";
import TutorListPagination from "../../tutors/TutorListPagination";
import { findReport } from "./reportConfig";
import { ReportsNotAvailable, usePermittedReports, NO_REPORT_PERMISSION } from "./OperationsReports";
import "./OperationsReports.css";

// API rows are dictionaries keyed by SQL column name; read them case-insensitively.
const read = (row, key) => row?.[key] ?? row?.[key.charAt(0).toLowerCase() + key.slice(1)];
const isCanceled = (e) => e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.name === "AbortError";
const errorMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

const defaultRange = () => {
  const today = new Date();
  return { fromDate: toDateOnly(new Date(today.getFullYear(), today.getMonth() - 2, 1)), toDate: toDateOnly(today) };
};

const fmtDate = (v) => (v ? moment(v).format("DD MMM YYYY") : "—");
const fmtNumber = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toLocaleString());
const fmtPct = (v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)}%`);
const fmtRating = (v) => (v === null || v === undefined ? "—" : Number(v).toFixed(2).replace(/\.?0+$/, ""));

const BADGE_TONE = {
  success: ["completed", "good", "active", "within range", "submitted", "high", "class completed"],
  danger: ["cancelled", "need attention", "dropped", "tutor", "not submitted", "above maximum", "rejected"],
  warning: ["not updated", "low", "below minimum", "holding", "reschedule requested", "not specified", "student", "tutor changed"],
};
const badgeTone = (value) => {
  const text = String(value || "").toLowerCase();
  if (BADGE_TONE.success.includes(text)) return "success";
  if (BADGE_TONE.danger.includes(text)) return "danger";
  if (BADGE_TONE.warning.includes(text) || text.includes("missing") || text.includes("late")) return "warning";
  return "neutral";
};

const TUTOR_FLAGS = [
  ["BelowMinStudents", "Below min students"],
  ["AboveMaxStudents", "Above max students"],
  ["OverCancellationLimit", "Over cancellation limit"],
  ["BelowMinWeeklyHours", "Below min weekly hours"],
];
const PATTERN_FLAGS = [
  ["OverCancellationLimit", "Over cancellation limit"],
  ["OverCancelRatio", "Over cancel ratio"],
];
const flagBadges = (row, flags) => {
  const active = flags.filter(([key]) => Number(read(row, key)) === 1);
  if (active.length === 0) return <span className="text-soft">—</span>;
  return (
    <span className="opr-flags">
      {active.map(([key, label]) => (
        <span key={key} className="opr-badge opr-badge-warning">{label}</span>
      ))}
    </span>
  );
};

const renderCell = (column, row, groupBy) => {
  const value = read(row, column.key);
  switch (column.type) {
    case "date":
      return fmtDate(value);
    case "time":
      return value ? moment(value).format("hh:mm A") : "—";
    case "month":
      return value ? moment(value).format("MMM YYYY") : "—";
    case "period":
      if (!value) return "—";
      if (groupBy === "month") return moment(value).format("MMM YYYY");
      if (groupBy === "week") return `Week of ${moment(value).format("DD MMM YYYY")}`;
      return fmtDate(value);
    case "number":
      return fmtNumber(value);
    case "pct":
      return fmtPct(value);
    case "rating":
      return value === null || value === undefined ? "—" : <span className="opr-rating"><Icon name="star-fill" />{fmtRating(value)}</span>;
    case "bool":
      return value === null || value === undefined ? "—" : value ? "Yes" : "No";
    case "badge":
      return value ? <span className={`opr-badge opr-badge-${badgeTone(value)}`}>{value}</span> : "—";
    case "student":
      return (
        <>
          <span className="opr-strong">{value || "—"}</span>
          {read(row, "StudentCode") && <span className="opr-code">{read(row, "StudentCode")}</span>}
        </>
      );
    case "marks": {
      const marks = read(row, "MarksObtained");
      const max = read(row, "MaxMarks");
      return marks === null || marks === undefined ? "—" : `${Number(marks)} / ${max ?? "—"}`;
    }
    case "range":
      return `${fmtNumber(read(row, "MinStudents"))} – ${fmtNumber(read(row, "MaxStudents"))}`;
    case "flags":
      return flagBadges(row, TUTOR_FLAGS);
    case "patternFlags":
      return flagBadges(row, PATTERN_FLAGS);
    default:
      return value === null || value === undefined || value === "" ? "—" : String(value);
  }
};

const selectStyles = {
  control: (base, state) => ({
    ...base, minHeight: 38, borderRadius: 8, borderColor: state.isFocused ? "#854fff" : "#dbdfea",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(133, 79, 255, 0.12)" : "none", "&:hover": { borderColor: "#c5b3ff" },
  }),
  menu: (base) => ({ ...base, zIndex: 20 }),
  option: (base, state) => ({ ...base, backgroundColor: state.isSelected ? "#854fff" : state.isFocused ? "#f5f1ff" : base.backgroundColor }),
};

const OperationsReportView = () => {
  const { report: reportKey } = useParams();
  const report = findReport(reportKey);
  const permitted = usePermittedReports();
  // Role Permission for this report (the API checks the same permission and answers 403 otherwise).
  const allowed = !!report && permitted.keys.has(report.key);
  const [range] = useState(defaultRange);

  const [fromDate, setFromDate] = useState(range.fromDate);
  const [toDate, setToDate] = useState(range.toDate);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tutor, setTutor] = useState(null);
  const [student, setStudent] = useState(null);
  const [subject, setSubject] = useState(null);
  const [viewKey, setViewKey] = useState(report?.views[0]?.key);
  const [status, setStatus] = useState("");
  const [groupBy, setGroupBy] = useState("day");
  const [sort, setSort] = useState({ by: null, dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [retry, setRetry] = useState(0);

  const [options, setOptions] = useState({ tutors: [], students: [], subjects: [] });
  const [summary, setSummary] = useState({ loading: true, error: "", data: null });
  const [table, setTable] = useState({ loading: true, error: "", rows: [], total: 0 });

  const view = report?.views.find((v) => v.key === viewKey) || report?.views[0];
  const has = (name) => report?.filters.includes(name);
  const rangeError = fromDate && toDate && fromDate > toDate ? "From date must be on or before To date." : "";

  // Switching to another report: start from its first tab and default view filters.
  const shownReportRef = useRef(reportKey);
  useEffect(() => {
    if (shownReportRef.current === reportKey) return;
    shownReportRef.current = reportKey;
    setViewKey(report?.views[0]?.key);
    setStatus("");
    setSort({ by: null, dir: "desc" });
    setPage(1);
  }, [reportKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!allowed) return undefined;
    const controller = new AbortController();
    getOperationsReportFilters(controller.signal)
      .then((res) => {
        const data = res?.data || {};
        const toOptions = (list) => (Array.isArray(list) ? list : []).map((o) => ({ value: read(o, "Value"), label: read(o, "Label") }));
        setOptions({ tutors: toOptions(data.tutors), students: toOptions(data.students), subjects: toOptions(data.subjects) });
      })
      .catch(() => {}); // filters stay empty; the report still works without them
    return () => controller.abort();
  }, [allowed]);

  const filterParams = useMemo(
    () => ({
      fromDate: has("date") ? fromDate : undefined,
      toDate: has("date") ? toDate : undefined,
      search: has("search") ? search : undefined,
      tutorId: has("tutor") ? tutor?.value : undefined,
      studentId: has("student") ? student?.value : undefined,
      subjectId: has("subject") ? subject?.value : undefined,
    }),
    [report, fromDate, toDate, search, tutor, student, subject] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Any filter change returns to page 1.
  useEffect(() => setPage(1), [filterParams, viewKey, status, groupBy, sort, pageSize]);

  useEffect(() => {
    if (!report || !allowed || rangeError) return undefined;
    const controller = new AbortController();
    setSummary((s) => ({ ...s, loading: true, error: "" }));
    getOperationsReportSummary(report.key, filterParams, controller.signal)
      .then((res) => !controller.signal.aborted && setSummary({ loading: false, error: "", data: res?.data || {} }))
      .catch((e) => !isCanceled(e) && setSummary({ loading: false, error: errorMessage(e, "Unable to load the summary."), data: null }));
    return () => controller.abort();
  }, [report, allowed, filterParams, rangeError, retry]);

  useEffect(() => {
    if (!report || !view || !allowed || rangeError) return undefined;
    const controller = new AbortController();
    setTable((t) => ({ ...t, loading: true, error: "" }));
    getOperationsReportView(
      report.key,
      view.key,
      { ...filterParams, status, groupBy: view.groupBy ? groupBy : undefined, sortBy: sort.by, sortDirection: sort.by ? sort.dir : undefined, page, pageSize },
      controller.signal
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        const total = Number(res?.totalRecords ?? rows.length);
        const lastPage = Math.max(1, Math.ceil(total / pageSize));
        if (rows.length === 0 && total > 0 && page > lastPage) {
          setPage(lastPage); // the result set shrank; show its last page instead of an empty one
          return;
        }
        setTable({ loading: false, error: "", rows, total });
      })
      .catch((e) => !isCanceled(e) && setTable({ loading: false, error: errorMessage(e, "Unable to load the report."), rows: [], total: 0 }));
    return () => controller.abort();
  }, [report, view, allowed, filterParams, status, groupBy, sort, page, pageSize, rangeError, retry]);

  const resetFilters = () => {
    const defaults = defaultRange();
    setFromDate(defaults.fromDate);
    setToDate(defaults.toDate);
    setSearchInput("");
    setSearch("");
    setTutor(null);
    setStudent(null);
    setSubject(null);
    setStatus("");
    setGroupBy("day");
    setSort({ by: null, dir: "desc" });
  };

  const toggleSort = (column) => {
    if (!column.sort) return;
    setSort((current) =>
      current.by === column.key ? { by: column.key, dir: current.dir === "asc" ? "desc" : "asc" } : { by: column.key, dir: "asc" }
    );
  };

  if (!report) {
    return (
      <>
        <Head title="Reports" />
        <Content>
          <div className="tct-ops-reports">
            <div className="opr-state">
              <Icon name="file-text" />
              <p>This report does not exist.</p>
              <Link to={`${process.env.PUBLIC_URL}/lms/operation/reports`} className="btn btn-outline-primary btn-sm">Back to reports</Link>
            </div>
          </div>
        </Content>
      </>
    );
  }

  const summaryData = summary.data || {};

  return (
    <>
      <Head title={report.title} />
      <Content>
        <div className="tct-ops-reports">
          <BlockHead size="sm">
            <BlockHeadContent>
              <Link to={`${process.env.PUBLIC_URL}/lms/operation/reports`} className="opr-back">
                <Icon name="arrow-left" />
                <span>All reports</span>
              </Link>
              <BlockTitle page tag="h3">{report.title}</BlockTitle>
              <p className="opr-sub">{report.description}</p>
            </BlockHeadContent>
          </BlockHead>

          {permitted.loading ? (
            <div className="opr-state" role="status"><Spinner color="primary" /> Checking access…</div>
          ) : !allowed ? (
            <ReportsNotAvailable message={NO_REPORT_PERMISSION} />
          ) : (
            <>
              {report.unavailable && (
                <Alert color="light" className="opr-unavailable">
                  <Icon name="info" />
                  <span>{report.unavailable}</span>
                </Alert>
              )}

              {/* Filters */}
              <div className="opr-filters" role="search">
                {has("date") && (
                  <>
                    <div className="opr-field">
                      <label htmlFor="oprFrom">From</label>
                      <input id="oprFrom" type="date" className="form-control" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="opr-field">
                      <label htmlFor="oprTo">To</label>
                      <input id="oprTo" type="date" className="form-control" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
                    </div>
                  </>
                )}
                {has("search") && (
                  <div className="opr-field opr-field-grow">
                    <label htmlFor="oprSearch">Search</label>
                    <div className="form-control-wrap">
                      <div className="form-icon form-icon-left"><Icon name="search" /></div>
                      <input id="oprSearch" type="search" className="form-control" placeholder="Student, tutor, code or subject" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                    </div>
                  </div>
                )}
                {has("tutor") && (
                  <div className="opr-field opr-field-select">
                    <label htmlFor="oprTutor">Tutor</label>
                    <Select inputId="oprTutor" isClearable placeholder="All tutors" options={options.tutors} value={tutor} onChange={setTutor} styles={selectStyles} />
                  </div>
                )}
                {has("student") && (
                  <div className="opr-field opr-field-select">
                    <label htmlFor="oprStudent">Student</label>
                    <Select inputId="oprStudent" isClearable placeholder="All students" options={options.students} value={student} onChange={setStudent} styles={selectStyles} />
                  </div>
                )}
                {has("subject") && (
                  <div className="opr-field opr-field-select">
                    <label htmlFor="oprSubject">Subject / course</label>
                    <Select inputId="oprSubject" isClearable placeholder="All subjects" options={options.subjects} value={subject} onChange={setSubject} styles={selectStyles} />
                  </div>
                )}
                <div className="opr-field opr-field-action">
                  <button type="button" className="btn btn-light" onClick={resetFilters}>
                    <Icon name="reload" />
                    <span>Reset filters</span>
                  </button>
                </div>
              </div>
              {rangeError && <Alert color="warning" className="opr-inline-alert">{rangeError}</Alert>}

              {/* Summary */}
              {summary.error ? (
                <Alert color="danger" className="opr-inline-alert">{summary.error}</Alert>
              ) : (
                <div className={`opr-stats ${summary.loading ? "is-loading" : ""}`} aria-busy={summary.loading}>
                  {report.summary.map((tile) => {
                    const value = read(summaryData, tile.key);
                    const hint = tile.hintKey ? tile.hintFormat(read(summaryData, tile.hintKey)) : tile.hint;
                    return (
                      <div key={tile.key} className="opr-stat">
                        <div className="opr-stat-value">
                          {summary.loading && !summary.data ? <Spinner size="sm" /> : tile.format === "pct" ? fmtPct(value) : tile.format === "rating" ? fmtRating(value) : fmtNumber(value)}
                        </div>
                        <div className="opr-stat-label">{tile.label}</div>
                        {hint && <div className="opr-stat-hint">{hint}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tabs + table */}
              <div className="opr-card opr-table-card">
                <div className="opr-tabs" role="tablist">
                  {report.views.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      role="tab"
                      aria-selected={v.key === view.key}
                      className={`opr-tab ${v.key === view.key ? "is-active" : ""}`}
                      onClick={() => {
                        setViewKey(v.key);
                        setStatus("");
                        setSort({ by: null, dir: "desc" });
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                {(view.statuses || view.groupBy) && (
                  <div className="opr-view-filters">
                    {view.groupBy && (
                      <div className="opr-segment" role="group" aria-label="Group by">
                        {[["day", "Daily"], ["week", "Weekly"], ["month", "Monthly"]].map(([value, label]) => (
                          <button key={value} type="button" className={groupBy === value ? "is-active" : ""} onClick={() => setGroupBy(value)}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    {view.statuses && (
                      <div className="opr-field opr-field-inline">
                        <label htmlFor="oprStatus">Show</label>
                        <div className="form-control-select">
                          <select id="oprStatus" className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">All</option>
                            {view.statuses.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {table.error ? (
                  <div className="opr-state">
                    <Icon name="alert-circle" className="text-danger" />
                    <p>{table.error}</p>
                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setRetry((x) => x + 1)}>Try again</button>
                  </div>
                ) : table.loading && table.rows.length === 0 ? (
                  <div className="opr-state" role="status"><Spinner color="primary" /> Loading report…</div>
                ) : table.rows.length === 0 ? (
                  <div className="opr-state">
                    <Icon name="inbox" />
                    <p>No records match these filters.</p>
                  </div>
                ) : (
                  <>
                    <div className={`opr-table-wrap ${table.loading ? "is-loading" : ""}`} aria-busy={table.loading}>
                      <Table hover className="mb-0">
                        <thead>
                          <tr>
                            {view.columns.map((column) => {
                              const active = sort.by === column.key;
                              const numeric = ["number", "pct", "rating"].includes(column.type);
                              return (
                                <th key={column.key} className={numeric ? "opr-num" : undefined} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                                  {column.sort ? (
                                    <button type="button" className={`opr-sort ${active ? "is-active" : ""}`} onClick={() => toggleSort(column)}>
                                      <span>{column.label}</span>
                                      <Icon name={active ? (sort.dir === "asc" ? "arrow-up" : "arrow-down") : "sort"} />
                                    </button>
                                  ) : (
                                    column.label
                                  )}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row, index) => (
                            <tr key={index}>
                              {view.columns.map((column) => {
                                const numeric = ["number", "pct", "rating"].includes(column.type);
                                return (
                                  <td key={column.key} className={[numeric && "opr-num", column.wrap && "opr-wrap"].filter(Boolean).join(" ") || undefined}>
                                    {renderCell(column, row, groupBy)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                    <TutorListPagination
                      page={page}
                      pageSize={pageSize}
                      total={table.total}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                      disabled={table.loading}
                    />
                  </>
                )}
              </div>

              {report.notes?.length > 0 && (
                <details className="opr-notes">
                  <summary>
                    <Icon name="info" />
                    <span>How this report is calculated</span>
                  </summary>
                  <ul>
                    {report.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      </Content>
    </>
  );
};

export default OperationsReportView;
