import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Alert, Badge, Card, Modal, ModalBody, ModalHeader, Spinner, Table } from "reactstrap";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Col,
  Icon,
  Row,
} from "../../../components/Component";
import { getCurrentOperationsDashboard } from "../../../apiservices/DashboardService";
import DashboardDateRange from "./DashboardDateRange";
import { toDateOnly as isoDate } from "../../../library/dashboardDates";
import "./OperationsDashboard.css";

const read = (row, name) => row?.[name] ?? row?.[name.charAt(0).toUpperCase() + name.slice(1)];
const number = (value) => Number(value) || 0;
const displayDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};
const displayTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const monthLabel = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString([], { month: "short", year: "2-digit" });
};

const EmptyRow = ({ columns, text = "No records found." }) => (
  <tr>
    <td colSpan={columns} className="text-center text-soft py-4">
      {text}
    </td>
  </tr>
);

// Card accent per existing colour prop (presentation only; see OperationsDashboard.css .ops-tone-*).
const STAT_TONE = { primary: "violet", warning: "amber", danger: "coral", info: "blue", success: "mint", purple: "indigo", gray: "slate", orange: "peach" };

const StatCard = ({ icon, label, value, color, onClick, note, cta }) => {
  const hasValue = value !== null && value !== undefined && value !== "";
  return (
    <Card
      className={`ops-stat ops-tone-${STAT_TONE[color] || "violet"} ${onClick ? "is-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <span className="ops-stat-icon">
        <Icon name={icon} />
      </span>
      <div className="ops-stat-body">
        {hasValue && <div className="ops-stat-value">{value}</div>}
        <div className={hasValue ? "ops-stat-label" : "ops-stat-label is-strong"}>{label}</div>
        {note && <small className="ops-stat-note">{note}</small>}
        {cta && <small className="ops-stat-cta">{cta}</small>}
      </div>
      {onClick && <Icon name="chevron-right" className="ops-stat-arrow" />}
    </Card>
  );
};

// Which two parties each mismatch card compares, and the row fields for each side.
const MISMATCH_SIDES = {
  studentMismatch: [
    { title: "Student", status: "studentStatus", start: "studentStartTime", end: "studentEndTime", comment: "studentComment" },
    { title: "Tutor", status: "tutorStatus", start: "tutorStartTime", end: "tutorEndTime", comment: "tutorComment" },
  ],
  tutorMismatch: [
    { title: "Tutor", status: "tutorStatus", start: "tutorStartTime", end: "tutorEndTime", comment: "tutorComment" },
    { title: "Operations", status: "operationStatus", start: "operationStartTime", end: "operationEndTime", comment: "operationComment" },
  ],
  operationMismatch: [
    { title: "Operations", status: "operationStatus", start: "operationStartTime", end: "operationEndTime", comment: "operationComment" },
    { title: "Tutor", status: "tutorStatus", start: "tutorStartTime", end: "tutorEndTime", comment: "tutorComment" },
  ],
};

const Section = ({ title, icon, action, children, tone = "violet" }) => (
  <Card className={`ops-panel ops-tone-${tone}`}>
    <div className="ops-panel-head">
      <h6 className="ops-panel-title">
        <span className="ops-panel-icon">
          <Icon name={icon} />
        </span>
        {title}
      </h6>
      {action}
    </div>
    <div className="ops-panel-body">{children}</div>
  </Card>
);

const chartTick = { fill: "#8094ae", fontSize: 12 };
const chartTooltip = {
  contentStyle: { borderRadius: 10, border: "1px solid #e5e9f2", boxShadow: "0 6px 18px rgba(31,43,58,.08)", fontSize: 13 },
  labelStyle: { color: "#1c2b46", fontWeight: 600, marginBottom: 4 },
};
// Popup badge colour from the existing status text (text itself is shown unchanged).
const statusColor = (text, fallback = "info") => {
  const value = String(text || "").toLowerCase();
  if (!value) return "light";
  if (value.includes("cancel")) return "danger";
  if (value.includes("complet")) return "success";
  if (value.includes("re-schedul") || value.includes("reschedul")) return "warning";
  if (value.includes("schedul")) return "primary";
  return fallback;
};
// Popup accent per card (matches the card colours on the dashboard).
const MODAL_TONE = {
  studentMismatch: "amber", operationMismatch: "coral", tutorMismatch: "blue", planned: "violet", rescheduled: "amber",
  extra: "mint", students: "mint", tutors: "blue", low: "amber", cancel: "coral", missed: "peach",
};
// Popup header icon per card (the same icon as the card that opens it).
const MODAL_ICON = {
  studentMismatch: "user", operationMismatch: "setting", tutorMismatch: "user-check", planned: "calendar", rescheduled: "repeat",
  extra: "calendar-check", students: "users", tutors: "user-check", low: "user-cross", cancel: "cross-circle", missed: "alert-circle",
};
// Bar colours for "Students enrolled by course" (cycled; data unchanged).
const COURSE_COLORS = ["#8b6cf6", "#4f8ef7", "#2bb58a", "#f2915a", "#22a6b3", "#6672e8", "#e5679a", "#e0a422", "#ef6b5b"];

const OperationsDashboard = ({ adminMode = false }) => {
  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(
    isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)),
  );
  const [toDate, setToDate] = useState(isoDate(today));
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [modal, setModal] = useState({ open: false, title: "", type: "", rows: [] });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getCurrentOperationsDashboard(toDate, fromDate, toDate);
        if (active) setDashboard(result);
      } catch (requestError) {
        if (active)
          setError(
            requestError?.response?.data?.message ||
              requestError?.message ||
              "Unable to load the Operations Dashboard.",
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [fromDate, toDate, refreshKey]);

  const summary = dashboard?.summary || {};
  const daily = dashboard?.dailySummary || {};
  const completion = dashboard?.dailyCompletion || {};
  const planned = dashboard?.plannedClasses || [];
  const rescheduled = dashboard?.rescheduledClasses || [];
  const students = dashboard?.activeStudents || [];
  const tutors = dashboard?.activeTutors || [];
  const lowEngagement = dashboard?.lowEngagementTutors || [];
  const cancellations = dashboard?.cancellations || [];
  const missed = dashboard?.missedAttendance || [];
  const timeWise = dashboard?.timeWiseClasses || [];
  const enrollment = dashboard?.enrollmentByCourse || [];
  const trend = dashboard?.enrollmentTrend || [];
  const studentMismatch = dashboard?.studentMismatch || [];
  const operationMismatch = dashboard?.operationMismatch || [];
  const tutorMismatch = dashboard?.tutorMismatch || [];
  const extraClasses = dashboard?.extraClasses || [];
  const courseChart = enrollment.map((item) => ({
    course: read(item, "courseName") || "Unknown",
    students: number(read(item, "enrolledStudents")),
  }));
  const trendChart = trend.map((item) => ({
    month: monthLabel(read(item, "enrollmentMonth")),
    enrollments: number(read(item, "newStudentCourseEnrollments")),
    students: number(read(item, "distinctStudents")),
  }));

  const openModal = (title, type, rows) => setModal({ open: true, title, type, rows });
  const closeModal = () => setModal((current) => ({ ...current, open: false }));

  const detailTable = () => {
    if (MISMATCH_SIDES[modal.type]) {
      const [sideA, sideB] = MISMATCH_SIDES[modal.type];
      const sideCell = (item, side) => {
        const status = read(item, side.status);
        const start = read(item, side.start);
        const end = read(item, side.end);
        const comment = read(item, side.comment);
        return (
          <>
            <Badge color={statusColor(status)}>{status || "Not recorded"}</Badge>
            {(start || end) && (
              <small className="d-block text-soft">
                {displayTime(start)} – {displayTime(end)}
              </small>
            )}
            {comment && <small className="d-block text-muted">{comment}</small>}
          </>
        );
      };
      if (modal.type === "extra")
  return (
    <Table responsive hover className="mb-0">
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Student</th>
          <th>Tutor</th>
          <th>Subject</th>
          <th>Status</th>
          <th>Extra Classes (Tutor + Student)</th>
        </tr>
      </thead>
      <tbody>
        {modal.rows.map((item, index) => (
          <tr key={read(item, "scheduleDetailsId") || index}>
            <td>{displayDate(read(item, "classDate"))}</td>
            <td>
              {displayTime(read(item, "startTime"))} –{" "}
              {displayTime(read(item, "endTime"))}
            </td>
            <td>{read(item, "studentName") || "—"}</td>
            <td>{read(item, "tutorName") || "—"}</td>
            <td>{read(item, "subjectName") || "—"}</td>
            <td>
              <Badge color="success">
                {read(item, "status") ||
                  read(item, "scheduleType") ||
                  "Extra Class"}
              </Badge>
            </td>
            <td>{number(read(item, "tutorStudentExtraClasses"))}</td>
          </tr>
        ))}
        {!modal.rows.length && (
          <EmptyRow columns={7} text="No extra classes found." />
        )}
      </tbody>
    </Table>
  );
      return (
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Student</th>
              <th>Tutor</th>
              <th>Subject</th>
              <th>{sideA.title}</th>
              <th>{sideB.title}</th>
            </tr>
          </thead>
          <tbody>
            {modal.rows.map((item, index) => (
              <tr key={read(item, "scheduleDetailsId") || index}>
                <td>{displayDate(read(item, "classDate"))}</td>
                <td>
                  {displayTime(read(item, "startTime"))} – {displayTime(read(item, "endTime"))}
                </td>
                <td>{read(item, "studentName") || "—"}</td>
                <td>{read(item, "tutorName") || "—"}</td>
                <td>{read(item, "subjectName") || "—"}</td>
                <td>{sideCell(item, sideA)}</td>
                <td>{sideCell(item, sideB)}</td>
              </tr>
            ))}
            {!modal.rows.length && <EmptyRow columns={7} />}
          </tbody>
        </Table>
      );
    }
    if (["planned", "rescheduled"].includes(modal.type))
      return (
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Student</th>
              <th>Tutor</th>
              <th>Subject</th>
              <th>Type / status</th>
            </tr>
          </thead>
          <tbody>
            {modal.rows.map((item, index) => (
              <tr key={read(item, "scheduleDetailsId") || index}>
                <td>{displayDate(read(item, "classDate"))}</td>
                <td>
                  {displayTime(read(item, "startTime"))} – {displayTime(read(item, "endTime"))}
                </td>
                <td>{read(item, "studentName") || "—"}</td>
                <td>{read(item, "tutorName") || "—"}</td>
                <td>{read(item, "subjectName") || "—"}</td>
                <td>
                  <Badge
                    color={
                      modal.type === "rescheduled"
                        ? "warning"
                        : statusColor(
                            read(item, "studentStatus") ||
                              read(item, "operationStatus") ||
                              read(item, "scheduleType") ||
                              read(item, "status") ||
                              "Scheduled",
                            "primary",
                          )
                    }
                  >
                    {read(item, "studentStatus") ||
                      read(item, "operationStatus") ||
                      read(item, "scheduleType") ||
                      read(item, "status") ||
                      "Scheduled"}
                  </Badge>
                </td>
              </tr>
            ))}
            {!modal.rows.length && <EmptyRow columns={6} />}
          </tbody>
        </Table>
      );
    if (modal.type === "students")
      return (
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>Student</th>
              <th>Board</th>
              <th>Grade</th>
              <th>Contact</th>
              <th>Allocations</th>
            </tr>
          </thead>
          <tbody>
            {modal.rows.map((item, index) => (
              <tr key={read(item, "studentId") || index}>
                <td>
                  {read(item, "studentName") || "—"}
                  <small className="d-block text-soft">{read(item, "studentCode")}</small>
                </td>
                <td>{read(item, "boardName") || "—"}</td>
                <td>{read(item, "gradeName") || "—"}</td>
                <td>{read(item, "email") || read(item, "phone") || "—"}</td>
                <td>{read(item, "activeAllocations") || 0}</td>
              </tr>
            ))}
            {!modal.rows.length && <EmptyRow columns={5} />}
          </tbody>
        </Table>
      );
    if (modal.type === "tutors" || modal.type === "low")
      return (
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>Tutor</th>
              <th>Joined</th>
              <th>Students</th>
              <th>Rating</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {modal.rows.map((item, index) => (
              <tr key={read(item, "tutorId") || index}>
                <td>
                  {read(item, "tutorName") || "—"}
                  <small className="d-block text-soft">{read(item, "userCode")}</small>
                </td>
                <td>{displayDate(read(item, "joiningDate"))}</td>
                <td>{read(item, "activeStudentCount") ?? read(item, "studentsWithinFirstThreeMonths") ?? 0}</td>
                <td>{read(item, "averageRating") ?? "—"}</td>
                <td>{read(item, "email") || read(item, "phone") || "—"}</td>
              </tr>
            ))}
            {!modal.rows.length && <EmptyRow columns={5} />}
          </tbody>
        </Table>
      );
    if (modal.type === "cancel")
      return (
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Tutor</th>
              <th>Subject</th>
              <th>Cancelled by</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            {modal.rows.map((item, index) => (
              <tr key={read(item, "scheduleDetailsId") || index}>
                <td>{displayDate(read(item, "classDate"))}</td>
                <td>{read(item, "studentName") || "—"}</td>
                <td>{read(item, "tutorName") || "—"}</td>
                <td>{read(item, "subjectName") || "—"}</td>
                <td>
                  <Badge color="danger">{read(item, "isTutorCancelled") ? "Tutor" : "Student"}</Badge>
                </td>
                <td>{read(item, "tutorComment") || read(item, "studentComment") || "—"}</td>
              </tr>
            ))}
            {!modal.rows.length && <EmptyRow columns={6} />}
          </tbody>
        </Table>
      );
    return (
      <Table responsive hover className="mb-0">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Student</th>
            <th>Tutor</th>
            <th>Subject</th>
            <th>Missing</th>
          </tr>
        </thead>
        <tbody>
          {modal.rows.map((item, index) => (
            <tr key={read(item, "scheduleDetailsId") || index}>
              <td>{displayDate(read(item, "classDate"))}</td>
              <td>{displayTime(read(item, "startTime"))}</td>
              <td>{read(item, "studentName") || "—"}</td>
              <td>{read(item, "tutorName") || "—"}</td>
              <td>{read(item, "subjectName") || "—"}</td>
              <td>
                {read(item, "studentAttendanceMissing") && (
                  <Badge color="warning" className="mr-1">
                    Student
                  </Badge>
                )}
                {read(item, "tutorAttendanceMissing") && <Badge color="danger">Tutor</Badge>}
              </td>
            </tr>
          ))}
          {!modal.rows.length && <EmptyRow columns={6} />}
        </tbody>
      </Table>
    );
  };

  return (
    <React.Fragment>
      <Head title={adminMode ? "Operations Admin Dashboard" : "Operations Dashboard"} />
      <Content>
        <div className="tct-ops-dash">
        <BlockHead size="sm" className="ops-head">
          <BlockBetween className="ops-head-row">
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Operations Dashboard
              </BlockTitle>
              <div className="nk-block-des ops-head-sub">
                <p>Real-time class monitoring, attendance alerts, and enrollment overview.</p>
              </div>
            </BlockHeadContent>
            <BlockHeadContent className="ops-head-controls">
              <DashboardDateRange fromDate={fromDate} toDate={toDate} loading={loading}
                onRefresh={(range) => { setFromDate(range.fromDate); setToDate(range.toDate); setRefreshKey((key) => key + 1); }} />
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {loading && <div role="status" className="text-soft mb-3"><Spinner size="sm" /> Loading dashboard…</div>}
        {error && (
          <Alert color="danger">
            <Icon name="alert-circle" className="mr-2" />
            {error}
          </Alert>
        )}
        {!error && dashboard && (
          <Block>
            <h6 className="ops-group-title">Attendance reconciliation</h6>
            <div className="ops-grid ops-grid-3">
              <div>
                <StatCard
                  icon="user"
                  label="Student mismatch"
                  value={studentMismatch.length}
                  color="warning"
                  note="Student vs tutor · classes"
                  onClick={() => openModal("Student mismatch", "studentMismatch", studentMismatch)}
                />
              </div>
              <div>
                <StatCard
                  icon="setting"
                  label="Operation mismatch"
                  value={operationMismatch.length}
                  color="danger"
                  note="Operations vs tutor · classes"
                  onClick={() => openModal("Operation mismatch", "operationMismatch", operationMismatch)}
                />
              </div>
              <div>
                <StatCard
                  icon="user-check"
                  label="Tutor mismatch"
                  value={tutorMismatch.length}
                  color="info"
                  note="Tutor vs operations · classes"
                  onClick={() => openModal("Tutor mismatch", "tutorMismatch", tutorMismatch)}
                />
              </div>
            </div>

            <h6 className="ops-group-title">Classes &amp; people</h6>
            <div className="ops-grid ops-grid-4">
              <div>
                <StatCard
                  icon="calendar"
                  label="Planned classes"
                  note={`For ${displayDate(toDate)}`}
                  value={number(read(summary, "todayPlannedClasses"))}
                  color="primary"
                  onClick={() => openModal("Planned classes", "planned", planned)}
                />
              </div>
              <div>
                <StatCard
                  icon="repeat"
                  label="Rescheduled"
                  note={`For ${displayDate(toDate)}`}
                  value={number(read(summary, "todayRescheduledClasses"))}
                  color="warning"
                  onClick={() => openModal("Rescheduled classes", "rescheduled", rescheduled)}
                />
              </div>
              <div>
                <StatCard
                  icon="calendar-check"
                  label="Extra Classes"
                  value={number(read(extraClasses[0], "totalExtraClasses"))}
                  color="success"
                  note="Completed as Extra Class / Prepon / Postpon in the selected period"
                  onClick={() =>
                    openModal("Extra Classes", "extra", extraClasses)
                  }
                />
              </div>
              <div>
                <StatCard
                  icon="users"
                  label="Active students"
                  value={number(read(summary, "activeStudents"))}
                  color="success"
                  onClick={() => openModal("Active students", "students", students)}
                />
              </div>
              <div>
                <StatCard
                  icon="user-check"
                  label="Active tutors"
                  value={number(read(summary, "activeTutors"))}
                  color="info"
                  onClick={() => openModal("Active tutors", "tutors", tutors)}
                />
              </div>
              <div>
                <StatCard icon="file-check" label="Test Series" value="—" color="purple" note="Coming soon" />
              </div>
              <div>
                <StatCard icon="calendar-booking" label="Planned PTM" value="—" color="gray" note="Coming soon" />
              </div>
            </div>

            <h6 className="ops-group-title">Alerts</h6>
            <div className="ops-grid ops-grid-3">
              <div>
                <StatCard
                  icon="user-cross"
                  label="Low engagement tutors"
                  value={lowEngagement.length}
                  color="warning"
                  note="≤ 5 students in first 3 months"
                  onClick={() => openModal("Low engagement tutors", "low", lowEngagement)}
                />
              </div>
              <div>
                <StatCard
                  icon="cross-circle"
                  label="Cancelled classes"
                  value={cancellations.length}
                  color="danger"
                  note={`${displayDate(fromDate)} – ${displayDate(toDate)}`}
                  onClick={() => openModal("Cancelled classes", "cancel", cancellations)}
                />
              </div>
              <div>
                <StatCard
                  icon="alert-circle"
                  label="Missed attendance"
                  value={missed.length}
                  color="orange"
                  note={`For ${displayDate(dashboard.dMinusOne)}`}
                  onClick={() => openModal("Missed attendance submission", "missed", missed)}
                />
              </div>
            </div>

            <div className="ops-split">
              <div>
                <Section title={`D-1 class status · ${displayDate(dashboard.dMinusOne)}`} icon="reports" tone="blue">
                  <div className="ops-d1">
                    <div className="ops-d1-tiles">
                      <div className="ops-d1-tile is-scheduled">
                        <div className="ops-d1-value">{number(read(daily, "scheduledClasses"))}</div>
                        <small className="ops-d1-label">Scheduled</small>
                      </div>
                      <div className="ops-d1-tile is-completed">
                        <div className="ops-d1-value">{number(read(daily, "completedClasses"))}</div>
                        <small className="ops-d1-label">Completed</small>
                      </div>
                      <div className="ops-d1-tile is-cancelled">
                        <div className="ops-d1-value">{number(read(daily, "cancelledClasses"))}</div>
                        <small className="ops-d1-label">Cancelled</small>
                      </div>
                    </div>
                    <div className="ops-d1-progress-head">
                      <span>Completion</span>
                      <strong>{number(read(completion, "completionPercentage")).toFixed(1)}%</strong>
                    </div>
                    <div className="progress ops-d1-progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${Math.min(100, number(read(completion, "completionPercentage")))}%` }}
                      />
                    </div>
                  </div>
                </Section>
              </div>
              <div>
                <Section title="Time-wise class details" icon="clock" tone="violet">
                  <div className="table-responsive ops-table-wrap">
                    <Table hover className="mb-0 ops-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Student</th>
                          <th>Subject</th>
                          <th>Grade</th>
                          <th>Tutor</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeWise.map((item, index) => (
                          <tr key={read(item, "scheduleDetailsId") || index}>
                            <td>
                              {displayTime(read(item, "startTime"))} – {displayTime(read(item, "endTime"))}
                            </td>
                            <td>{read(item, "studentName") || "—"}</td>
                            <td>{read(item, "subjectName") || "—"}</td>
                            <td>{read(item, "gradeName") || "—"}</td>
                            <td>{read(item, "tutorName") || "—"}</td>
                            <td>
                              <Badge color={read(item, "status") === "Class Completed" ? "success" : "primary"}>
                                {read(item, "status") || "Scheduled"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {!timeWise.length && <EmptyRow columns={6} text="No classes scheduled for this date." />}
                      </tbody>
                    </Table>
                  </div>
                </Section>
              </div>
            </div>

            <div className="ops-enroll-head">
              <h6 className="ops-group-title mb-0">Enrollment</h6>
              <Link
                to={`${process.env.PUBLIC_URL}/lms/assessment/question-paper-upload`}
                className="btn btn-outline-primary ops-upload"
              >
                <Icon name="upload" className="mr-1" />
                Upload Question Papers
              </Link>
            </div>
            <div className="ops-split ops-split-even">
              <div>
                <Section title="Students enrolled by course" icon="book" tone="indigo">
                  <div className="ops-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={courseChart} margin={{ top: 8, left: 0, right: 15, bottom: 35 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
                        <XAxis dataKey="course" angle={-25} textAnchor="end" interval={0} height={70} tick={chartTick} tickLine={false} axisLine={{ stroke: "#e5e9f2" }} />
                        <YAxis allowDecimals={false} tick={chartTick} tickLine={false} axisLine={false} width={40} />
                        <Tooltip {...chartTooltip} cursor={{ fill: "rgba(133,79,255,0.06)" }} />
                        <Bar dataKey="students" name="Students" fill="#8b6cf6" radius={[6, 6, 0, 0]} maxBarSize={48}>
                          {courseChart.map((entry, index) => (
                            <Cell key={entry.course || index} fill={COURSE_COLORS[index % COURSE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              </div>
              <div>
                <Section title="Enrollment trend" icon="growth" tone="mint">
                  <div className="ops-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendChart} margin={{ top: 8, left: 0, right: 15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="operationsEnrollment" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2bb58a" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#2bb58a" stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
                        <XAxis dataKey="month" tick={chartTick} tickLine={false} axisLine={{ stroke: "#e5e9f2" }} />
                        <YAxis allowDecimals={false} tick={chartTick} tickLine={false} axisLine={false} width={40} />
                        <Tooltip {...chartTooltip} />
                        <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                        <Area
                          type="monotone"
                          dataKey="enrollments"
                          name="Course enrollments"
                          stroke="#2bb58a"
                          strokeWidth={2}
                          fill="url(#operationsEnrollment)"
                          dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                          activeDot={{ r: 5 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="students"
                          name="Students"
                          stroke="#6672e8"
                          strokeWidth={2}
                          fill="transparent"
                          dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              </div>
            </div>
          </Block>
        )}
        </div>

        <Modal
          isOpen={modal.open}
          toggle={closeModal}
          size="xl"
          centered
          scrollable
          className={`ops-modal ops-tone-${MODAL_TONE[modal.type] || "violet"}`}
        >
          <ModalHeader toggle={closeModal}>
            <span className="ops-modal-icon" aria-hidden="true">
              <Icon name={MODAL_ICON[modal.type] || "list"} />
            </span>
            {modal.title}
            <Badge color="light" className="ml-2 ops-modal-count">
              {modal.rows.length}
            </Badge>
          </ModalHeader>
          <ModalBody className="p-0">{detailTable()}</ModalBody>
        </Modal>
      </Content>
    </React.Fragment>
  );
};

export default OperationsDashboard;
