import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import moment from "moment";
import Select from "react-select";
import { Alert, Spinner, Table } from "reactstrap";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import Head from "../../../../layout/head/Head";
import Content from "../../../../layout/content/Content";
import { BlockHead, BlockHeadContent, BlockTitle, Icon } from "../../../../components/Component";
import { toDateOnly } from "../../../../library/dashboardDates";
import {
  getAccountsReportFilters,
  getAccountsReportSummary,
  getAccountsReportView,
} from "../../../../apiservices/AccountsReportsService";
import TutorListPagination from "../../tutors/TutorListPagination";
import { findAccountsReport, fmtCount, fmtMoney } from "./accountsReportConfig";
import { AccountsReportsNotAvailable, usePermittedAccountsReports, NO_ACCOUNTS_REPORT_PERMISSION } from "./AccountsReports";
import "../../operation/reports/OperationsReports.css";
import "./AccountsReports.css";

// API rows are dictionaries keyed by SQL column name; read them case-insensitively.
const read = (row, key) => row?.[key] ?? row?.[key.charAt(0).toLowerCase() + key.slice(1)];
const isCanceled = (e) => e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.name === "AbortError";
const errorMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

// Default range: the current month to date (the Accounts dashboard's monthly view).
const defaultRange = () => {
  const today = new Date();
  return { fromDate: toDateOnly(new Date(today.getFullYear(), today.getMonth(), 1)), toDate: toDateOnly(today) };
};

const fmtDate = (v) => (v ? moment(v).format("DD MMM YYYY") : "—");
const fmtPct = (v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)}%`);
const fmtPeriod = (v, groupBy) => {
  if (!v) return "—";
  const m = moment(v);
  if (groupBy === "day") return m.format("DD MMM YYYY");
  if (groupBy === "quarter") return `Q${m.quarter()} ${m.format("YYYY")}`;
  if (groupBy === "year") return m.format("YYYY");
  return m.format("MMM YYYY");
};
const compactMoney = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

const BADGE_TONE = {
  success: ["paid", "sent to tutor", "before due date"],
  danger: ["overdue", "critical", "dropped", "dp dropped", "dc dropped", "tutor changed dropped"],
  warning: ["partially paid", "non-critical", "on/after due date", "pending"],
};
const badgeTone = (value) => {
  const text = String(value || "").toLowerCase();
  if (BADGE_TONE.success.includes(text)) return "success";
  if (BADGE_TONE.danger.includes(text)) return "danger";
  if (BADGE_TONE.warning.includes(text)) return "warning";
  return "neutral";
};

const NUMERIC = ["number", "currency", "pct", "metric"];

const renderCell = (column, row, groupBy) => {
  const value = read(row, column.key);
  switch (column.type) {
    case "date":
      return fmtDate(value);
    case "month":
      return value ? moment(value).format("MMM YYYY") : "—";
    case "period":
      return fmtPeriod(value, groupBy);
    case "number":
      return fmtCount(value);
    case "currency":
      return fmtMoney(value);
    case "pct":
      return fmtPct(value);
    case "metric":
      return Number(read(row, "IsAmount")) === 1 ? fmtMoney(value) : fmtCount(value);
    case "badge":
      return value ? <span className={`opr-badge opr-badge-${badgeTone(value)}`}>{value}</span> : "—";
    case "student":
      return (
        <>
          <span className="opr-strong">{value || "—"}</span>
          {read(row, "StudentCode") && <span className="opr-code">{read(row, "StudentCode")}</span>}
        </>
      );
    case "tutor":
      return (
        <>
          <span className="opr-strong">{value || "—"}</span>
          {read(row, "TutorCode") && <span className="opr-code">{read(row, "TutorCode")}</span>}
        </>
      );
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

const CHART_COLORS = ["#854fff", "#2bb58a", "#f2915a", "#4f8ef7", "#e5679a", "#e0a422", "#22a6b3", "#6672e8", "#ef6b5b", "#8094ae"];

const SELECT_FILTERS = [
  ["student", "studentId", "Student", "All students", "students"],
  ["tutor", "tutorId", "Tutor", "All tutors", "tutors"],
  ["subject", "subjectId", "Course / subject", "All courses", "subjects"],
  ["bank", "bankId", "Bank", "All banks", "banks"],
  ["board", "boardId", "Board", "All boards", "boards"],
  ["grade", "gradeId", "Grade", "All grades", "grades"],
  ["country", "country", "Region (country)", "All regions", "countries"],
  ["mode", "paymentMode", "Payment method", "All methods", "paymentModes"],
];
const EMPTY_SELECTS = SELECT_FILTERS.reduce((acc, [name]) => ({ ...acc, [name]: null }), {});

const ReportChart = ({ chart, rows, groupBy }) => {
  const label = (v) => {
    if (chart.xType === "period") return fmtPeriod(v, groupBy);
    if (chart.xType === "month") return v ? moment(v).format("MMM YYYY") : "—";
    if (chart.xType === "date") return v ? moment(v).format("DD MMM") : "—";
    return v === null || v === undefined || v === "" ? "Not set" : String(v);
  };
  const isCount = chart.series.every((s) => s.count);
  const valueFormat = (v) => (isCount ? fmtCount(v) : fmtMoney(v));
  const data = rows.map((row) => {
    const point = { name: label(read(row, chart.x)) };
    chart.series.forEach((s) => {
      point[s.key] = Number(read(row, s.key)) || 0;
    });
    return point;
  });

  if (chart.type === "pie") {
    const s = chart.series[0];
    const slices = data.filter((d) => d[s.key] > 0);
    if (slices.length === 0) return <div className="acr-chart-empty">Nothing to chart for these filters.</div>;
    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={slices} dataKey={s.key} nameKey="name" innerRadius={62} outerRadius={104} paddingAngle={2} isAnimationActive={false}>
            {slices.map((entry, i) => (
              <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => valueFormat(v)} />
          <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: 12, maxWidth: "45%" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  const Chart = chart.type === "line" ? LineChart : BarChart;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <Chart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#8094ae" }} tickLine={false} axisLine={{ stroke: "#e5e9f2" }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 12, fill: "#8094ae" }} tickLine={false} axisLine={false} width={64} tickFormatter={isCount ? (v) => fmtCount(v) : compactMoney} allowDecimals={!isCount} />
        <Tooltip formatter={(v) => valueFormat(v)} />
        {chart.series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {chart.series.map((s, i) =>
          chart.type === "line" ? (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={CHART_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          ) : (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={CHART_COLORS[i]} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          )
        )}
      </Chart>
    </ResponsiveContainer>
  );
};

const AccountsReportView = () => {
  const { report: reportKey } = useParams();
  const report = findAccountsReport(reportKey);
  const permitted = usePermittedAccountsReports();
  // Role Permission for this report (the API checks the same permission and answers 403 otherwise).
  const allowed = !!report && permitted.keys.has(report.key);
  const [range] = useState(defaultRange);

  const [fromDate, setFromDate] = useState(range.fromDate);
  const [toDate, setToDate] = useState(range.toDate);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selects, setSelects] = useState(EMPTY_SELECTS);
  const [viewKey, setViewKey] = useState(report?.views[0]?.key);
  const [status, setStatus] = useState("");
  const [groupBy, setGroupBy] = useState("month");
  const [sort, setSort] = useState({ by: null, dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [retry, setRetry] = useState(0);

  const [options, setOptions] = useState({});
  const [summary, setSummary] = useState({ loading: true, error: "", data: null });
  const [table, setTable] = useState({ loading: true, error: "", rows: [], total: 0 });
  const [chartState, setChartState] = useState({ loading: false, error: "", rows: [], total: 0 });
  const [dynamicStatuses, setDynamicStatuses] = useState([]);

  const view = report?.views.find((v) => v.key === viewKey) || report?.views[0];
  const has = (name) => report?.filters.includes(name);
  const rangeError = fromDate && toDate && fromDate > toDate ? "From date must be on or before To date." : "";
  const statuses = view?.statusesFrom ? dynamicStatuses : view?.statuses;

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
    getAccountsReportFilters(controller.signal)
      .then((res) => {
        const data = res?.data || {};
        const toOptions = (list) => (Array.isArray(list) ? list : []).map((o) => ({ value: read(o, "Value"), label: read(o, "Label") }));
        setOptions(SELECT_FILTERS.reduce((acc, [, , , , source]) => ({ ...acc, [source]: toOptions(data[source]) }), {}));
      })
      .catch(() => {}); // filters stay empty; the report still works without them
    return () => controller.abort();
  }, [allowed]);

  const filterParams = useMemo(() => {
    const params = {
      fromDate: has("date") ? fromDate : undefined,
      toDate: has("date") ? toDate : undefined,
      search: has("search") ? search : undefined,
    };
    SELECT_FILTERS.forEach(([name, param]) => {
      params[param] = has(name) ? selects[name]?.value : undefined;
    });
    return params;
  }, [report, fromDate, toDate, search, selects]); // eslint-disable-line react-hooks/exhaustive-deps

  // Any filter change returns to page 1.
  useEffect(() => setPage(1), [filterParams, viewKey, status, groupBy, sort, pageSize]);

  useEffect(() => {
    if (!report || !allowed || rangeError) return undefined;
    const controller = new AbortController();
    setSummary((s) => ({ ...s, loading: true, error: "" }));
    getAccountsReportSummary(report.key, filterParams, controller.signal)
      .then((res) => !controller.signal.aborted && setSummary({ loading: false, error: "", data: res?.data || {} }))
      .catch((e) => !isCanceled(e) && setSummary({ loading: false, error: errorMessage(e, "Unable to load the summary."), data: null }));
    return () => controller.abort();
  }, [report, allowed, filterParams, rangeError, retry]);

  useEffect(() => {
    if (!report || !view || !allowed || rangeError) return undefined;
    const controller = new AbortController();
    setTable((t) => ({ ...t, loading: true, error: "" }));
    const paged = view.paged !== false;
    getAccountsReportView(
      report.key,
      view.key,
      {
        ...filterParams, status, groupBy: view.groupBy ? groupBy : undefined, sortBy: sort.by, sortDirection: sort.by ? sort.dir : undefined,
        page: paged ? page : 1, pageSize: paged ? pageSize : 100,
      },
      controller.signal
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        const total = Number(res?.totalRecords ?? rows.length);
        const lastPage = Math.max(1, Math.ceil(total / pageSize));
        if (paged && rows.length === 0 && total > 0 && page > lastPage) {
          setPage(lastPage); // the result set shrank; show its last page instead of an empty one
          return;
        }
        setTable({ loading: false, error: "", rows, total });
      })
      .catch((e) => !isCanceled(e) && setTable({ loading: false, error: errorMessage(e, "Unable to load the report."), rows: [], total: 0 }));
    return () => controller.abort();
  }, [report, view, allowed, filterParams, status, groupBy, sort, page, pageSize, rangeError, retry]);

  // Chart: the same view and filters (not the table's page or sort), up to the first 100 rows in chart order.
  useEffect(() => {
    if (!report || !view?.chart || !allowed || rangeError) return undefined;
    const controller = new AbortController();
    setChartState((c) => ({ ...c, loading: true, error: "" }));
    getAccountsReportView(
      report.key,
      view.key,
      { ...filterParams, status, groupBy: view.groupBy ? groupBy : undefined, sortBy: view.chart.sortBy, sortDirection: view.chart.sortDirection, page: 1, pageSize: 100 },
      controller.signal
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setChartState({ loading: false, error: "", rows, total: Number(res?.totalRecords ?? rows.length) });
      })
      .catch((e) => !isCanceled(e) && setChartState({ loading: false, error: errorMessage(e, "Unable to load the chart."), rows: [], total: 0 }));
    return () => controller.abort();
  }, [report, view, allowed, filterParams, status, groupBy, rangeError, retry]);

  // Status options that come from data (dropout reasons recorded in the range).
  useEffect(() => {
    if (!report || !view?.statusesFrom || !allowed || rangeError) return undefined;
    const controller = new AbortController();
    getAccountsReportView(report.key, view.statusesFrom, { ...filterParams, page: 1, pageSize: 100 }, controller.signal)
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        setDynamicStatuses(rows.map((r) => read(r, "ReasonName")).filter(Boolean).map((v) => [v, v]));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [report, view, allowed, filterParams, rangeError]);

  const resetFilters = () => {
    const defaults = defaultRange();
    setFromDate(defaults.fromDate);
    setToDate(defaults.toDate);
    setSearchInput("");
    setSearch("");
    setSelects(EMPTY_SELECTS);
    setStatus("");
    setGroupBy("month");
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
        <Head title="Accounts Reports" />
        <Content>
          <div className="tct-ops-reports tct-acc-reports">
            <div className="opr-state">
              <Icon name="file-text" />
              <p>This report does not exist.</p>
              <Link to={`${process.env.PUBLIC_URL}/lms/accounts/reports`} className="btn btn-outline-primary btn-sm">Back to reports</Link>
            </div>
          </div>
        </Content>
      </>
    );
  }

  const summaryData = summary.data || {};
  const tileValue = (tile, value) => {
    if (tile.format === "currency") return fmtMoney(value);
    if (tile.format === "pct") return fmtPct(value);
    if (tile.format === "text") return value || "—";
    return fmtCount(value);
  };

  return (
    <>
      <Head title={report.title} />
      <Content>
        <div className={`tct-ops-reports tct-acc-reports acr-tone-${report.key}`}>
          <BlockHead size="sm">
            <BlockHeadContent>
              <Link to={`${process.env.PUBLIC_URL}/lms/accounts/reports`} className="opr-back">
                <Icon name="arrow-left" />
                <span>All Accounts reports</span>
              </Link>
              <BlockTitle page tag="h3">{report.title}</BlockTitle>
              <p className="opr-sub">{report.description}</p>
            </BlockHeadContent>
          </BlockHead>

          {permitted.loading ? (
            <div className="opr-state" role="status"><Spinner color="primary" /> Checking access…</div>
          ) : !allowed ? (
            <AccountsReportsNotAvailable message={NO_ACCOUNTS_REPORT_PERMISSION} />
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
                      <label htmlFor="acrFrom">From</label>
                      <input id="acrFrom" type="date" className="form-control" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="opr-field">
                      <label htmlFor="acrTo">To</label>
                      <input id="acrTo" type="date" className="form-control" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
                    </div>
                  </>
                )}
                {has("search") && (
                  <div className="opr-field opr-field-grow">
                    <label htmlFor="acrSearch">Search</label>
                    <div className="form-control-wrap">
                      <div className="form-icon form-icon-left"><Icon name="search" /></div>
                      <input id="acrSearch" type="search" className="form-control" placeholder="Student, code, invoice no. or course" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                    </div>
                  </div>
                )}
                {SELECT_FILTERS.filter(([name]) => has(name)).map(([name, , label, placeholder, source]) => {
                  const list = options[source] || [];
                  return (
                    <div key={name} className="opr-field opr-field-select">
                      <label htmlFor={`acr-${name}`}>{label}</label>
                      <Select
                        inputId={`acr-${name}`}
                        isClearable
                        placeholder={options[source] && list.length === 0 ? "None recorded" : placeholder}
                        isDisabled={!!options[source] && list.length === 0}
                        options={list}
                        value={selects[name]}
                        onChange={(value) => setSelects((s) => ({ ...s, [name]: value }))}
                        styles={selectStyles}
                      />
                    </div>
                  );
                })}
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
                <div className="opr-inline-alert alert alert-danger acr-summary-error">
                  <span>{summary.error}</span>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRetry((x) => x + 1)}>Try again</button>
                </div>
              ) : (
                <div className={`opr-stats acr-stats ${summary.loading ? "is-loading" : ""}`} aria-busy={summary.loading}>
                  {report.summary.map((tile) => {
                    const value = read(summaryData, tile.key);
                    const hint = summary.data && tile.hint ? tile.hint(summaryData) : null;
                    return (
                      <div key={tile.key} className="opr-stat">
                        <div className="opr-stat-value">{summary.loading && !summary.data ? <Spinner size="sm" /> : tileValue(tile, value)}</div>
                        <div className="opr-stat-label">{tile.label}</div>
                        {hint && <div className="opr-stat-hint">{hint}</div>}
                        {tile.help && <div className="opr-stat-hint">{tile.help}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tabs, chart + table */}
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

                {(statuses?.length > 0 || view.groupBy) && (
                  <div className="opr-view-filters">
                    {view.groupBy && (
                      <div className="opr-segment" role="group" aria-label="Group by">
                        {[["day", "Daily"], ["month", "Monthly"], ["quarter", "Quarterly"], ["year", "Yearly"]].map(([value, label]) => (
                          <button key={value} type="button" className={groupBy === value ? "is-active" : ""} aria-pressed={groupBy === value} onClick={() => setGroupBy(value)}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    {statuses?.length > 0 && (
                      <div className="opr-field opr-field-inline">
                        <label htmlFor="acrStatus">{view.statusesFrom ? "Reason" : "Show"}</label>
                        <div className="form-control-select">
                          <select id="acrStatus" className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">All</option>
                            {statuses.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {view.chart && !table.error && (
                  <div className={`acr-chart ${chartState.loading ? "is-loading" : ""}`} aria-busy={chartState.loading}>
                    {chartState.error ? (
                      <div className="acr-chart-empty text-danger">{chartState.error}</div>
                    ) : chartState.loading && chartState.rows.length === 0 ? (
                      <div className="acr-chart-empty"><Spinner size="sm" color="primary" /> Loading chart…</div>
                    ) : chartState.rows.length === 0 ? null : (
                      <>
                        <ReportChart chart={view.chart} rows={chartState.rows} groupBy={groupBy} />
                        {chartState.total > chartState.rows.length && (
                          <div className="acr-chart-note">Chart shows the first {chartState.rows.length} of {fmtCount(chartState.total)} rows; the table lists all.</div>
                        )}
                      </>
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
                              const numeric = NUMERIC.includes(column.type);
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
                                const numeric = NUMERIC.includes(column.type);
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
                    {view.paged !== false && (
                      <TutorListPagination
                        page={page}
                        pageSize={pageSize}
                        total={table.total}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                        disabled={table.loading}
                      />
                    )}
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

export default AccountsReportView;
