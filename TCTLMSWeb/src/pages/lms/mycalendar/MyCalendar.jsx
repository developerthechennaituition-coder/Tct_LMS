import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import Select from "react-select";
import moment from "moment";
import { toast, ToastContainer } from "react-toastify";
import { Modal, ModalBody, ModalFooter, Spinner } from "reactstrap";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { Block, Icon } from "../../../components/Component";
import CalenderApp from "../../../components/partials/calender/Calender";
import {
  getMyCalendarDemos,
  getMyCalendarClasses,
  getMyCalendarFollowUps,
  getDemoStatusOptions,
  getDemoStatus,
  updateDemoStatus,
  getTaskAssignees,
  getMyTasks,
  createUserTask,
  completeUserTask,
  myCalendarErrorMessage,
} from "../../../apiservices/MyCalendarService";
import { dDayFilterOptions, demoDayMarkerDate, demoFollowUpCategory, LONG_FOLLOW_UP, SHORT_FOLLOW_UP } from "../../../library/demoFollowUp";
import { criticalTaskOffset, groupCriticalTasks, selectMyTaskDemos } from "../../../library/myCalendarTasks";
import { showsClassEvents, toClassEvent, visibleClassEvents } from "../../../library/myCalendarClasses";
import "./MyCalendar.css";

// Roles without My Calendar (the server enforces the same rule).
const EXCLUDED_ROLES = ["tutor", "student"];
const PRIORITIES = ["Low", "Medium", "High"];
const roleLabel = (role) => String(role || "").replace(/([a-z])([A-Z])/g, "$1 $2");
const emptyTaskForm = { assignee: null, title: "", description: "", dueDate: "", priority: "" };

// ─── Demo calendar ──────────────────────────────────────────────────────────────
const ALL_STATUSES = "";
const OTHER_STATUSES = "other";
const OTHER_PREFIX = "other:";
// Filter key of an enrolment status code (demos without a status use "none").
const statusKey = (code) => (code === null || code === undefined ? "none" : String(code));
const toDateInput = (value) => (value ? moment(value).format("YYYY-MM-DD") : "");
// D-day filter: D-N shows each eligible upcoming demo N calendar days before its actual scheduled date.
// Options: D-1 … D-7, plus D-8 … D-N when a demo is that far ahead (dDayFilterOptions).
const ALL_D_DAYS = "";

// Demo status modal: details of the clicked demo / reminder and, for the enrolment's own Coordinator,
// the status form (12 statuses; a single "Remind Me" date for 7 of them; dropout reason for DC Dropped).
const DemoStatusModal = ({ item, options, onClose, onSaved }) => {
  const canUpdate = Boolean(item?.canUpdateStatus);
  const [state, setState] = useState({ loading: canUpdate, error: "" });
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState({ statusCode: "", reminderDate: "", dropoutReasonId: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canUpdate) return;
    let alive = true;
    getDemoStatus(item.salesDetailsId)
      .then((response) => {
        if (!alive) return;
        const data = response?.data || {};
        setCurrent(data);
        const known = options.statuses.some((s) => s.code === data.statusCode);
        // Saved reminder / reason belong to the current status only when it was set from here.
        const fromHistory = data.lastHistoryStatusId && data.lastHistoryStatusId === data.statusId;
        setForm({
          statusCode: known ? String(data.statusCode) : "",
          reminderDate: fromHistory ? toDateInput(data.reminderDate) : "",
          dropoutReasonId: fromHistory && data.dropoutReasonId ? data.dropoutReasonId : "",
        });
        setState({ loading: false, error: "" });
      })
      .catch((error) => {
        if (!alive) return;
        setState({ loading: false, error: myCalendarErrorMessage(error, "Unable to load the demo status. Please try again.") });
      });
    return () => {
      alive = false;
    };
  }, [canUpdate, item, options]);

  const selected = options.statuses.find((s) => String(s.code) === String(form.statusCode));
  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const save = () => {
    const next = {};
    if (!selected) next.statusCode = "Please choose a status.";
    if (selected?.requiresReminderDate) {
      if (!form.reminderDate) next.reminderDate = "Please choose a Remind Me date.";
      else if (!moment(form.reminderDate, "YYYY-MM-DD", true).isValid()) next.reminderDate = "Please enter a valid date.";
    }
    if (selected?.requiresDropoutReason && !form.dropoutReasonId) next.dropoutReasonId = "Please select a dropout reason.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    updateDemoStatus({
      salesDetailsId: item.salesDetailsId,
      statusCode: selected.code,
      reminderDate: selected.requiresReminderDate ? `${form.reminderDate}T00:00:00` : null,
      dropoutReasonId: selected.requiresDropoutReason ? form.dropoutReasonId : null,
    })
      .then((response) => {
        toast.success(response?.message || "Demo status updated.");
        onSaved();
      })
      .catch((error) => toast.error(myCalendarErrorMessage(error, "Unable to update the demo status. Please try again.")))
      .finally(() => setSaving(false));
  };

  const currentLabel = current?.statusName || item?.statusLabel || "—";
  const kind = item?.isReminder ? "Reminder" : item?.isDayMarker ? `D-${item.dayOffset} reminder` : "Demo class";
  return (
    <Modal isOpen toggle={saving ? undefined : onClose} className="modal-dialog-centered mc-status-modal" size="md">
      <div className="mc-sm-head">
        <span className="mc-sm-icon" aria-hidden="true"><Icon name={item?.isReminder || item?.isDayMarker ? "clock" : "calendar-booking"} /></span>
        <div className="mc-sm-head-text">
          <h5 className="mc-sm-title">{item?.studentName || "Demo"}</h5>
          <p className="mc-sm-sub">{[item?.subjectName, kind].filter(Boolean).join(" · ")}</p>
        </div>
        <button type="button" className="mc-sm-close" aria-label="Close" onClick={onClose} disabled={saving}>
          <Icon name="cross" />
        </button>
      </div>
      <ModalBody>
        <dl className="mc-sm-details">
          <dt>Student</dt>
          <dd>{item?.studentName || "—"}</dd>
          <dt>Tutor</dt>
          <dd>{item?.tutorName || "—"}</dd>
          <dt>Subject</dt>
          <dd>{item?.subjectName || "—"}</dd>
          {item?.isReminder ? (
            <>
              <dt>Remind me</dt>
              <dd>{moment(item.reminderDate).format("DD-MMM-YYYY")}</dd>
            </>
          ) : (
            <>
              {item?.isDayMarker && (
                <>
                  <dt>Reminder</dt>
                  <dd>D-{item.dayOffset} · {moment(item.markerDate).format("DD-MMM-YYYY")}</dd>
                </>
              )}
              <dt>Demo date</dt>
              <dd>{moment(item?.demoStart).format("DD-MMM-YYYY")}, {moment(item?.demoStart).format("hh:mm A")} – {moment(item?.demoEnd).format("hh:mm A")}</dd>
              <dt>Class status</dt>
              <dd>{item?.scheduleStatusName || "—"}</dd>
            </>
          )}
          <dt>Demo status</dt>
          <dd><span className="mc-status-pill">{currentLabel}</span></dd>
          {current?.reminderDate && current?.lastHistoryStatusId === current?.statusId && !item?.isReminder && (
            <>
              <dt>Remind me</dt>
              <dd>{moment(current.reminderDate).format("DD-MMM-YYYY")}</dd>
            </>
          )}
          {current?.dropoutReasonName && current?.lastHistoryStatusId === current?.statusId && (
            <>
              <dt>Dropout reason</dt>
              <dd>{current.dropoutReasonName}</dd>
            </>
          )}
          {current?.changedDate && (
            <>
              <dt>Last changed</dt>
              <dd>
                {moment.utc(current.changedDate).local().format("DD-MMM-YYYY hh:mm A")}
                {current.changedByName ? ` by ${current.changedByName}` : ""}
              </dd>
            </>
          )}
        </dl>

        {!canUpdate ? (
          <p className="mc-sm-note"><Icon name="info" /> Only the Coordinator of this enrolment can change its demo status.</p>
        ) : state.loading ? (
          <div className="mc-state" role="status"><Spinner size="sm" color="primary" /> Loading status…</div>
        ) : state.error ? (
          <div className="mc-state is-error" role="alert"><Icon name="alert-circle" /> {state.error}</div>
        ) : (
          <div className="mc-sm-form">
            <div className="mc-field">
              <label className="form-label" htmlFor="mc-sm-status">Update status <span className="text-danger">*</span></label>
              <select id="mc-sm-status" className="form-control" value={form.statusCode}
                onChange={(e) => setField("statusCode", e.target.value)} disabled={saving}>
                <option value="">Select a status</option>
                {options.statuses.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
              {errors.statusCode && <span className="mc-error">{errors.statusCode}</span>}
            </div>
            {selected?.requiresDropoutReason && (
              <div className="mc-field">
                <label className="form-label" htmlFor="mc-sm-reason">Dropout reason <span className="text-danger">*</span></label>
                <select id="mc-sm-reason" className="form-control" value={form.dropoutReasonId}
                  onChange={(e) => setField("dropoutReasonId", e.target.value)} disabled={saving}>
                  <option value="">Select a reason</option>
                  {options.dropoutReasons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {errors.dropoutReasonId && <span className="mc-error">{errors.dropoutReasonId}</span>}
              </div>
            )}
            {selected?.requiresReminderDate && (
              <div className="mc-field">
                <label className="form-label" htmlFor="mc-sm-remind">Remind Me <span className="text-danger">*</span></label>
                <input id="mc-sm-remind" type="date" className="form-control" value={form.reminderDate}
                  onChange={(e) => setField("reminderDate", e.target.value)} disabled={saving} />
                {errors.reminderDate && <span className="mc-error">{errors.reminderDate}</span>}
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button type="button" className="btn btn-light" onClick={onClose} disabled={saving}>{canUpdate ? "Cancel" : "Close"}</button>
        {canUpdate && !state.loading && !state.error && (
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <Spinner size="sm" /> : <Icon name="check" />} <span>{saving ? "Saving…" : "Save status"}</span>
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
};

// One demo row from the API → the event shape the shared calendar reads (see TCTScheduleCalender).
const toDemoEvent = (item) => ({
  id: `my-demo-${item.scheduleDetailsId}`,
  scheduleDetailsId: item.scheduleDetailsId,
  scheduleId: item.scheduleId,
  studentId: item.studentId,
  title: [item.studentName, item.subjectName].filter(Boolean).join(" · ") || item.title || "Demo class",
  start: item.startTime,
  end: item.endTime,
  startTime: item.startTime,
  endTime: item.endTime,
  demoStart: item.startTime,
  demoEnd: item.endTime,
  studentName: item.studentName,
  tutorName: item.tutorName,
  subjectName: item.subjectName,
  subjectId: item.subjectId,
  scheduleType: item.scheduleType,
  className: "bg-info text-white",
  meetingLink: item.meetingLink,
  tutorUserId: item.tutorUserId,
  studentUserId: item.studentUserId,
  scheduleStatusName: item.statusName,
  canDisable: true,
  tutorScheduleStatus: item.tutorScheduleStatus,
  studentScheduleStatus: item.studentScheduleStatus,
  operationScheduleStatus: item.operationScheduleStatus,
  salesDetailsId: item.salesDetailsId,
  // Required by the shared popup's GET /Sales/salesDetails (without it the request sends
  // salesId=undefined and the API answers 400).
  salesId: item.salesId,
  isBlocked: false,
  // Enrolment (follow-up) status: drives the filter and the status modal.
  statusCode: item.enrollmentStatusCode,
  statusLabel: item.enrollmentStatusName,
  canUpdateStatus: item.canUpdateStatus,
});

const DemoCalendar = () => {
  const initialDate = useMemo(() => new Date(), []);
  const [visibleDate, setVisibleDate] = useState(initialDate);
  const [demos, setDemos] = useState([]);
  // Demos of the following month: only used by the D-day filter (a demo early next month can fall in this month).
  const [nextMonthDemos, setNextMonthDemos] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  // Regular classes of the month (read-only), from GET /my-calendar/classes.
  const [classes, setClasses] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [options, setOptions] = useState({ statuses: [], dropoutReasons: [] });
  const [filterCode, setFilterCode] = useState(ALL_STATUSES);
  const [dayOffset, setDayOffset] = useState(ALL_D_DAYS);
  const [openItem, setOpenItem] = useState(null);
  // Every enrolment status seen in the loaded months (code → name, from the API). Statuses outside the
  // 12 configured ones (e.g. "Demo Completed" set by tutor completion) are offered under "Other statuses".
  const [seenStatuses, setSeenStatuses] = useState({});

  useEffect(() => {
    getDemoStatusOptions()
      .then((response) => setOptions({
        statuses: response?.data?.statuses || [],
        dropoutReasons: response?.data?.dropoutReasons || [],
      }))
      .catch((error) => toast.error(myCalendarErrorMessage(error, "Unable to load demo statuses.")));
  }, []);

  const loadMonth = useCallback((date) => {
    setVisibleDate(date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const next = moment(date).add(1, "month");
    setStatus({ loading: true, error: "" });
    Promise.all([
      getMyCalendarDemos(month, year),
      getMyCalendarFollowUps(month, year),
      getMyCalendarDemos(next.month() + 1, next.year()),
      // Regular classes: Operations roles only. A class-load failure must not hide the demos: it is reported on its own.
      showsClassEvents(localStorage.getItem("userRole"))
        ? getMyCalendarClasses(month, year).catch((error) => {
            toast.error(myCalendarErrorMessage(error, "Unable to load your classes."));
            return null;
          })
        : Promise.resolve(null),
    ])
      .then(([demoResponse, followUpResponse, nextResponse, classResponse]) => {
        const rows = Array.isArray(demoResponse?.data) ? demoResponse.data : [];
        const nextRows = Array.isArray(nextResponse?.data) ? nextResponse.data : [];
        setDemos(rows.map(toDemoEvent));
        setNextMonthDemos(nextRows.map(toDemoEvent));
        setClasses((Array.isArray(classResponse?.data) ? classResponse.data : []).map(toClassEvent));
        const reminders = Array.isArray(followUpResponse?.data) ? followUpResponse.data : [];
        setFollowUps(
          reminders.map((item) => ({
            id: `my-reminder-${item.historyId}`,
            scheduleDetailsId: `reminder-${item.historyId}`,
            isFollowUp: true, // shared calendar: labelled marker instead of class times
            isReminder: true,
            allDay: true,
            start: toDateInput(item.reminderDate), // a single day only
            reminderDate: item.reminderDate,
            markerHeading: "Reminder",
            markerDateText: moment(item.reminderDate).format("DD-MMM-YYYY"),
            title: `${item.statusName} · ${item.studentName || ""}`,
            className: "mc-followup-event",
            studentName: item.studentName,
            tutorName: item.tutorName,
            subjectName: item.subjectName,
            salesDetailsId: item.salesDetailsId,
            salesId: item.salesId,
            statusCode: item.statusCode,
            statusLabel: item.statusName,
            canUpdateStatus: item.canUpdateStatus,
          }))
        );
        setSeenStatuses((prev) => {
          const seen = { ...prev };
          [...rows, ...nextRows].forEach((d) => { seen[statusKey(d.enrollmentStatusCode)] = d.enrollmentStatusName || "No status"; });
          reminders.forEach((f) => { seen[statusKey(f.statusCode)] = f.statusName || "No status"; });
          return seen;
        });
        setStatus({ loading: false, error: "" });
      })
      .catch((error) => {
        setDemos([]);
        setNextMonthDemos([]);
        setFollowUps([]);
        setClasses([]);
        setStatus({ loading: false, error: myCalendarErrorMessage(error, "Unable to load your demo classes. Please try again.") });
      });
  }, []);

  useEffect(() => {
    loadMonth(initialDate);
  }, [loadMonth, initialDate]);

  // The filters are applied to the loaded data, so they survive month / view changes.
  const configured = useMemo(() => new Set(options.statuses.map((s) => statusKey(s.code))), [options]);
  const otherStatuses = Object.entries(seenStatuses)
    .filter(([key]) => !configured.has(key))
    .sort((a, b) => a[1].localeCompare(b[1]));
  // DP Short / DP Long Follow-up are saved statuses and also categories calculated from the Actual Demo
  // Date (1-14 / 15-30 days ahead, see demoFollowUp.js). Their filter shows both: records saved with the
  // status, and demo classes that currently fall in its window. Reminders keep their saved status only.
  const followUpCategory = [SHORT_FOLLOW_UP, LONG_FOLLOW_UP].find(
    (label) => label === options.statuses.find((s) => String(s.code) === String(filterCode))?.label
  );
  const matches = (item) => {
    const key = statusKey(item.statusCode);
    if (filterCode === ALL_STATUSES) return true;
    if (filterCode === OTHER_STATUSES) return !configured.has(key);
    if (filterCode.startsWith(OTHER_PREFIX)) return !configured.has(key) && key === filterCode.slice(OTHER_PREFIX.length);
    if (key === String(filterCode)) return true;
    return Boolean(followUpCategory && !item.isReminder && demoFollowUpCategory(item.demoStart, item.statusCode) === followUpCategory);
  };

  const offset = dayOffset === ALL_D_DAYS ? 0 : Number(dayOffset);
  let visibleDemos, visibleReminders, dayMarkers, markersInMonth;
  if (offset) {
    // D-N: each eligible upcoming demo appears N calendar days before its actual scheduled date (original
    // dates unchanged), from today onward — so today's D-N markers are the demos N days from today.
    // Completed, dropped, cancelled and other excluded statuses get no marker (demoFollowUp.js).
    // Demos of this and the next month are shifted. Every marker is kept, so one landing in the adjacent
    // month still shows in a week (or month-grid day) that spans both months; the calendar only draws the
    // visible range. The summary counts the markers in the loaded month.
    const monthStart = moment(visibleDate).startOf("month");
    const monthEnd = moment(visibleDate).endOf("month");
    const seen = new Set();
    dayMarkers = [...demos, ...nextMonthDemos]
      .filter((d) => (seen.has(d.scheduleDetailsId) ? false : seen.add(d.scheduleDetailsId)))
      .filter(matches)
      .map((d) => ({ d, markerDay: demoDayMarkerDate(d.demoStart, d.statusCode, offset) }))
      .filter(({ markerDay }) => markerDay !== null)
      .map(({ d, markerDay }) => {
        const markerDate = moment(markerDay, "YYYY-MM-DD");
        return {
          ...d,
          id: `my-dday-${offset}-${d.scheduleDetailsId}`,
          scheduleDetailsId: `dday-${offset}-${d.scheduleDetailsId}`,
          isFollowUp: true, // shared calendar: labelled marker instead of class times
          isDayMarker: true,
          dayOffset: offset,
          markerDate: markerDate.format("YYYY-MM-DD"),
          allDay: true,
          start: markerDate.format("YYYY-MM-DD"),
          end: undefined,
          statusLabel: `D-${offset}`,
          markerHeading: `D-${offset} reminder`,
          markerDateText: `Demo on ${moment(d.demoStart).format("DD-MMM-YYYY, hh:mm A")}`,
          className: "mc-dday-event",
        };
      });
    markersInMonth = dayMarkers.filter((m) => moment(m.markerDate).isBetween(monthStart, monthEnd, "day", "[]")).length;
    visibleDemos = [];
    visibleReminders = [];
  } else {
    dayMarkers = [];
    markersInMonth = 0;
    visibleDemos = demos.filter(matches);
    visibleReminders = followUps.filter(matches);
  }
  const visibleClasses = visibleClassEvents(classes, { allStatuses: filterCode === ALL_STATUSES, dDayActive: Boolean(offset) });
  const events = useMemo(
    () => [...visibleDemos, ...visibleReminders, ...dayMarkers, ...visibleClasses],
    [demos, nextMonthDemos, followUps, classes, filterCode, dayOffset, configured, visibleDate] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const filterLabel =
    filterCode === OTHER_STATUSES
      ? "Other statuses"
      : filterCode.startsWith(OTHER_PREFIX)
        ? seenStatuses[filterCode.slice(OTHER_PREFIX.length)] || "Other status"
        : options.statuses.find((s) => String(s.code) === String(filterCode))?.label;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : word.endsWith("s") ? "es" : "s"}`;
  const summary = offset
    ? markersInMonth === 0
      ? `No demos at D-${offset} in this month${filterLabel ? ` (${filterLabel})` : ""}.`
      : `${plural(markersInMonth, "demo")} at D-${offset} (shown ${offset} day${offset === 1 ? "" : "s"} before the demo date)${filterLabel ? ` · ${filterLabel}` : ""}`
    : visibleDemos.length === 0 && visibleReminders.length === 0 && visibleClasses.length === 0
      ? filterLabel
        ? `No "${filterLabel}" demos in this month.`
        : "No demo classes scheduled for you in this month."
      : `${plural(visibleDemos.length, "demo class")}` +
        (visibleReminders.length ? ` · ${plural(visibleReminders.length, "reminder")}` : "") +
        (visibleClasses.length ? ` · ${plural(visibleClasses.length, "class")}` : "") +
        (filterLabel ? ` (${filterLabel})` : " this month") +
        (followUpCategory ? ` · saved status, or demo due in ${followUpCategory === SHORT_FOLLOW_UP ? "1–14" : "15–30"} days` : "");

  return (
    <div className="mc-panel">
      <div className="mc-cal-bar">
        <div className="mc-filter">
          <label htmlFor="mc-status-filter">Status</label>
          <select id="mc-status-filter" className="form-control" value={filterCode} onChange={(e) => setFilterCode(e.target.value)}>
            <option value={ALL_STATUSES}>All Statuses</option>
            <optgroup label="My Calendar statuses">
              {options.statuses.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
            </optgroup>
            {otherStatuses.length > 0 && (
              <optgroup label="Other statuses">
                <option value={OTHER_STATUSES}>All other statuses</option>
                {otherStatuses.map(([key, name]) => <option key={key} value={`${OTHER_PREFIX}${key}`}>{name}</option>)}
              </optgroup>
            )}
          </select>
        </div>
        <div className="mc-filter mc-filter-dday">
          <label htmlFor="mc-dday-filter">Demo Date Reminder</label>
          <select id="mc-dday-filter" className="form-control" value={dayOffset} onChange={(e) => setDayOffset(e.target.value)}>
            <option value={ALL_D_DAYS}>All D-Day Filters</option>
            {dDayFilterOptions([...demos, ...nextMonthDemos], dayOffset).map((n) => <option key={n} value={n}>D-{n}</option>)}
          </select>
        </div>
        <div className="mc-legends">
          <span className="mc-legend">
            <span className="mc-legend-dot" aria-hidden="true" /> Demo class
          </span>
          <span className="mc-legend">
            <span className="mc-legend-dot is-followup" aria-hidden="true" /> Reminder
          </span>
          <span className="mc-legend">
            <span className="mc-legend-dot is-dday" aria-hidden="true" /> D-day
          </span>
          {showsClassEvents(localStorage.getItem("userRole")) && (
            <span className="mc-legend">
              <span className="mc-legend-dot is-class" aria-hidden="true" /> Class
            </span>
          )}
        </div>
        {status.loading && (
          <span className="mc-cal-status" role="status">
            <Spinner size="sm" color="primary" /> Loading demo classes…
          </span>
        )}
        {!status.loading && status.error && (
          <span className="mc-cal-status is-error" role="alert">
            <Icon name="alert-circle" /> {status.error}
          </span>
        )}
        {!status.loading && !status.error && (
          <span className="mc-cal-status" role="status">{summary}</span>
        )}
      </div>
      <CalenderApp
        events={events}
        onDelete={() => {}}
        onEdit={() => {}}
        scheduleType="coordinator"
        onMonthChange={loadMonth}
        initialDate={initialDate}
        readOnly
        stableHover
        onEventClick={(item) => { if (!item?.isClass) setOpenItem(item); }}
      />
      {openItem && (
        <DemoStatusModal
          item={openItem}
          options={options}
          onClose={() => setOpenItem(null)}
          onSaved={() => {
            setOpenItem(null);
            loadMonth(visibleDate);
          }}
        />
      )}
    </div>
  );
};

// ─── Tasks ──────────────────────────────────────────────────────────────────────
const statusBadge = (task) => {
  if (task.status === "Completed") return <span className="mc-badge is-done">Completed</span>;
  const overdue = moment(task.dueDate).isBefore(moment(), "day");
  return <span className={`mc-badge ${overdue ? "is-overdue" : "is-pending"}`}>{overdue ? "Overdue" : "Pending"}</span>;
};

const TaskCard = ({ task, mode, onComplete, completing }) => {
  const [nextStatus, setNextStatus] = useState(task.status);
  const canComplete = mode === "mine" && task.status !== "Completed";
  return (
    <div className="mc-task">
      <div className="mc-task-head">
        <h6 className="mc-task-title">{task.title}</h6>
        {statusBadge(task)}
      </div>
      <p className="mc-task-desc">{task.description}</p>
      <div className="mc-task-meta">
        <span><Icon name="calendar" /> Due {moment(task.dueDate).format("DD-MMM-YYYY")}</span>
        {task.priority && <span className={`mc-priority is-${task.priority.toLowerCase()}`}>{task.priority} priority</span>}
        {mode === "mine" ? (
          <span><Icon name="user" /> From {task.assignedByName || "—"}</span>
        ) : (
          <span><Icon name="user" /> To {task.assignedToName || "—"}</span>
        )}
        {task.status === "Completed" && task.completedDate && (
          <span><Icon name="check-circle" /> Completed {moment.utc(task.completedDate).local().format("DD-MMM-YYYY")}</span>
        )}
      </div>
      {canComplete && (
        <div className="mc-task-actions">
          <label className="sr-only" htmlFor={`task-status-${task.id}`}>Status</label>
          <select
            id={`task-status-${task.id}`}
            className="form-control"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value)}
            disabled={completing}
          >
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
          <button
            type="button"
            className="btn btn-primary"
            disabled={nextStatus !== "Completed" || completing}
            onClick={() => onComplete(task)}
          >
            {completing ? <Spinner size="sm" /> : <Icon name="check" />}
            <span>Update status</span>
          </button>
        </div>
      )}
    </div>
  );
};

// My Task: upcoming demo sessions 1-3 days ahead (D-1 … D-3) whose saved status still needs follow-up
// (rules in library/myCalendarTasks.js). Same API and access rule as the Demo Calendar; the current
// and next month are read, which always covers the next three days (also at month / year end). Loaded
// with the Tasks panel so the tab count shows before the tab is opened; the window is recalculated from
// today on every render.
const MY_TASK_MONTHS = 2;
const useMyTaskDemos = () => {
  const [demos, setDemos] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });

  const load = useCallback(() => {
    setState({ loading: true, error: "" });
    const months = Array.from({ length: MY_TASK_MONTHS }, (_, i) => moment().startOf("month").add(i, "months"));
    Promise.all(months.map((m) => getMyCalendarDemos(m.month() + 1, m.year())))
      .then((responses) => {
        setDemos(responses.flatMap((response) => (Array.isArray(response?.data) ? response.data : [])));
        setState({ loading: false, error: "" });
      })
      .catch((error) => setState({ loading: false, error: myCalendarErrorMessage(error, "Unable to load your demo classes. Please try again.") }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = selectMyTaskDemos(demos);
  return { items, state, load };
};

const MyTaskDemoList = ({ items, state, load }) => {
  if (state.loading) return <div className="mc-state" role="status"><Spinner size="sm" color="primary" /> Loading demo classes…</div>;
  if (state.error) {
    return (
      <div className="mc-state is-error" role="alert">
        <Icon name="alert-circle" /> {state.error}
        <button type="button" className="btn btn-sm btn-light" onClick={load}>Retry</button>
      </div>
    );
  }
  if (items.length === 0) {
    return <div className="mc-state"><Icon name="calendar-booking" /> No demos in the next three days need follow-up.</div>;
  }
  return (
    <div className="mc-task-list">
      {items.map((d) => (
        <div className="mc-task" key={d.scheduleDetailsId}>
          <div className="mc-task-head">
            <h6 className="mc-task-title">{[d.studentName, d.subjectName].filter(Boolean).join(" · ") || d.title || "Demo class"}</h6>
            <span className="mc-badge is-dday" title={`Demo in ${d.dDay} day${d.dDay === 1 ? "" : "s"}`}>D-{d.dDay}</span>
          </div>
          <div className="mc-task-meta">
            <span><Icon name="calendar" /> {moment(d.startTime).format("DD-MMM-YYYY")}, {moment(d.startTime).format("hh:mm A")} – {moment(d.endTime).format("hh:mm A")}</span>
            <span><Icon name="user" /> Tutor {d.tutorName || "NA"}</span>
            {d.enrollmentStatusName && <span><Icon name="info" /> {d.enrollmentStatusName}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

// Critical: the user's own incomplete tasks due from tomorrow onward (D+1 … D+N), grouped by due
// date. Uses the tasks already loaded by the Tasks panel and the existing TaskCard (same fields and
// "Update status" action as Assigned to me).
const CriticalTaskList = ({ tasks, tasksState, loadTasks, completeTask, completingId }) => {
  if (tasksState.loading && tasks.length === 0) return <div className="mc-state" role="status"><Spinner size="sm" color="primary" /> Loading tasks…</div>;
  if (tasksState.error) {
    return (
      <div className="mc-state is-error" role="alert">
        <Icon name="alert-circle" /> {tasksState.error}
        <button type="button" className="btn btn-sm btn-light" onClick={loadTasks}>Retry</button>
      </div>
    );
  }
  if (tasks.length === 0) {
    return <div className="mc-state"><Icon name="check-round-cut" /> No incomplete tasks are due from tomorrow onward.</div>;
  }
  const groups = groupCriticalTasks(tasks);
  return (
    <div className="mc-task-list">
      {groups.map((g) => (
        <section key={g.offset} className="mc-critical-group" aria-label={`Due in ${g.offset} day${g.offset === 1 ? "" : "s"}`}>
          <h6 className="mc-critical-head">
            <span className="mc-badge is-overdue">D+{g.offset}</span>
            {g.offset === 1 ? "Due Tomorrow" : `Due in ${g.offset} Days`} — {moment(g.dueDate, "YYYY-MM-DD").format("DD-MMM-YYYY")}
          </h6>
          {g.tasks.map((task) => (
            <TaskCard key={task.id} task={task} mode="mine" onComplete={completeTask} completing={completingId === task.id} />
          ))}
        </section>
      ))}
    </div>
  );
};

const TaskPanel = () => {
  const userId = localStorage.getItem("userId");
  const [assignees, setAssignees] = useState([]);
  const [assigneesState, setAssigneesState] = useState({ loading: true, error: "" });
  const [tasks, setTasks] = useState([]);
  const [tasksState, setTasksState] = useState({ loading: true, error: "" });
  const [form, setForm] = useState(emptyTaskForm);
  const [formErrors, setFormErrors] = useState({});
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [listTab, setListTab] = useState("mine");
  // My Task and Critical open full width; Back returns to the tab that was open before them.
  const [tabBeforeCritical, setTabBeforeCritical] = useState("mine");
  const myTaskDemos = useMyTaskDemos();
  const isExpandedTab = listTab === "mytask" || listTab === "critical";
  const openExpandedTab = (next) => {
    if (!isExpandedTab) setTabBeforeCritical(listTab);
    setListTab(next);
  };

  const loadTasks = useCallback(() => {
    setTasksState((s) => ({ ...s, loading: true, error: "" }));
    getMyTasks()
      .then((response) => {
        setTasks(Array.isArray(response?.data) ? response.data : []);
        setTasksState({ loading: false, error: "" });
      })
      .catch((error) => setTasksState({ loading: false, error: myCalendarErrorMessage(error, "Unable to load tasks. Please try again.") }));
  }, []);

  useEffect(() => {
    getTaskAssignees()
      .then((response) => {
        setAssignees(Array.isArray(response?.data) ? response.data : []);
        setAssigneesState({ loading: false, error: "" });
      })
      .catch((error) => setAssigneesState({ loading: false, error: myCalendarErrorMessage(error, "Unable to load users. Please try again.") }));
    loadTasks();
  }, [loadTasks]);

  const assigneeOptions = useMemo(
    () =>
      assignees.map((a) => ({
        value: a.userId,
        label: a.name,
        roles: a.roles || [],
        meta: [a.userCode, a.email].filter(Boolean).join(" · "),
        search: `${a.name} ${a.userCode || ""} ${a.email || ""} ${(a.roles || []).map(roleLabel).join(" ")}`.toLowerCase(),
      })),
    [assignees]
  );

  const myTasks = tasks.filter((t) => String(t.assignedToUserId).toLowerCase() === String(userId).toLowerCase());
  const givenTasks = tasks.filter((t) => String(t.assignedByUserId).toLowerCase() === String(userId).toLowerCase());
  const myPendingCount = myTasks.filter((t) => t.status !== "Completed").length;
  // Critical: my incomplete tasks due from tomorrow onward; recalculated whenever the task list reloads.
  const criticalTasks = myTasks
    .map((t) => ({ ...t, criticalOffset: criticalTaskOffset(t) }))
    .filter((t) => t.criticalOffset !== null);
  const today = moment().format("YYYY-MM-DD");

  const validate = () => {
    const errors = {};
    if (!form.assignee) errors.assignee = "Select the person to assign this task to.";
    if (!form.title.trim()) errors.title = "Task title is required.";
    else if (form.title.trim().length > 200) errors.title = "Use 200 characters or fewer.";
    if (!form.description.trim()) errors.description = "Task description is required.";
    else if (form.description.trim().length > 2000) errors.description = "Use 2000 characters or fewer.";
    if (!form.dueDate) errors.dueDate = "Due date is required.";
    else if (form.dueDate < today) errors.dueDate = "Due date cannot be in the past.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitTask = () => {
    setSubmitting(true);
    createUserTask({
      assignedToUserId: form.assignee.value,
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: `${form.dueDate}T00:00:00`,
      priority: form.priority || null,
    })
      .then((response) => {
        toast.success(response?.message || "Task assigned successfully.");
        setForm(emptyTaskForm);
        setFormErrors({});
        setReviewing(false);
        setListTab("given");
        loadTasks();
      })
      .catch((error) => toast.error(myCalendarErrorMessage(error, "Unable to assign the task. Please try again.")))
      .finally(() => setSubmitting(false));
  };

  const completeTask = (task) => {
    setCompletingId(task.id);
    completeUserTask(task.id)
      .then((response) => {
        toast.success(response?.message || "Task marked as completed.");
        loadTasks();
      })
      .catch((error) => {
        toast.error(myCalendarErrorMessage(error, "Unable to update the task. Please try again."));
        loadTasks();
      })
      .finally(() => setCompletingId(null));
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const listed = listTab === "mine" ? myTasks : givenTasks;

  return (
    <div className={`mc-tasks${isExpandedTab ? " is-critical" : ""}`}>
      {/* Assign */}
      <section className="mc-card mc-assign" aria-labelledby="mc-assign-title">
        <div className="mc-card-head">
          <span className="mc-card-icon" aria-hidden="true"><Icon name="task" /></span>
          <div>
            <h5 id="mc-assign-title" className="mc-card-title">Assign a task</h5>
            <p className="mc-card-sub">The task and its notification go to the selected person only.</p>
          </div>
        </div>

        {!reviewing ? (
          <div className="mc-form">
            <div className="mc-field">
              <label className="form-label" htmlFor="mc-assignee">Assign to <span className="text-danger">*</span></label>
              <Select
                inputId="mc-assignee"
                classNamePrefix="react-select"
                className="mc-select"
                options={assigneeOptions}
                value={form.assignee}
                onChange={(option) => setField("assignee", option)}
                isLoading={assigneesState.loading}
                isDisabled={!!assigneesState.error}
                placeholder={assigneesState.loading ? "Loading users…" : "Search by name, code, email or role"}
                noOptionsMessage={() => "No matching staff users"}
                filterOption={(option, input) => !input || option.data.search.includes(input.toLowerCase())}
                formatOptionLabel={(option, { context }) =>
                  context === "menu" ? (
                    <div className="mc-opt">
                      <span className="mc-opt-name">{option.label}</span>
                      <span className="mc-opt-roles">{option.roles.map(roleLabel).join(", ")}</span>
                      {option.meta && <span className="mc-opt-meta">{option.meta}</span>}
                    </div>
                  ) : (
                    <span>
                      {option.label} <span className="mc-opt-inline-role">· {option.roles.map(roleLabel).join(", ")}</span>
                    </span>
                  )
                }
              />
              {assigneesState.error && <span className="mc-error">{assigneesState.error}</span>}
              {formErrors.assignee && <span className="mc-error">{formErrors.assignee}</span>}
            </div>
            <div className="mc-field">
              <label className="form-label" htmlFor="mc-title">Task title <span className="text-danger">*</span></label>
              <input id="mc-title" className="form-control" maxLength={200} value={form.title}
                onChange={(e) => setField("title", e.target.value)} placeholder="e.g. Call parent about demo feedback" />
              {formErrors.title && <span className="mc-error">{formErrors.title}</span>}
            </div>
            <div className="mc-field">
              <label className="form-label" htmlFor="mc-description">Description <span className="text-danger">*</span></label>
              <textarea id="mc-description" className="form-control" rows={4} maxLength={2000} value={form.description}
                onChange={(e) => setField("description", e.target.value)} placeholder="What needs to be done?" />
              {formErrors.description && <span className="mc-error">{formErrors.description}</span>}
            </div>
            <div className="mc-field-row">
              <div className="mc-field">
                <label className="form-label" htmlFor="mc-due">Due date <span className="text-danger">*</span></label>
                <input id="mc-due" type="date" className="form-control" min={today} value={form.dueDate}
                  onChange={(e) => setField("dueDate", e.target.value)} />
                {formErrors.dueDate && <span className="mc-error">{formErrors.dueDate}</span>}
              </div>
              <div className="mc-field">
                <label className="form-label" htmlFor="mc-priority">Priority</label>
                <select id="mc-priority" className="form-control" value={form.priority}
                  onChange={(e) => setField("priority", e.target.value)}>
                  <option value="">Not set</option>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="mc-form-actions">
              <button type="button" className="btn btn-primary" onClick={() => validate() && setReviewing(true)}>
                <Icon name="eye" /> <span>Review task</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mc-review">
            <dl>
              <dt>Assign to</dt>
              <dd>{form.assignee?.label} <span className="mc-opt-inline-role">· {form.assignee?.roles.map(roleLabel).join(", ")}</span></dd>
              <dt>Title</dt>
              <dd>{form.title.trim()}</dd>
              <dt>Description</dt>
              <dd className="mc-review-desc">{form.description.trim()}</dd>
              <dt>Due date</dt>
              <dd>{moment(form.dueDate).format("DD-MMM-YYYY")}</dd>
              <dt>Priority</dt>
              <dd>{form.priority || "Not set"}</dd>
            </dl>
            <div className="mc-form-actions">
              <button type="button" className="btn btn-light" onClick={() => setReviewing(false)} disabled={submitting}>
                <Icon name="edit" /> <span>Edit</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={submitTask} disabled={submitting}>
                {submitting ? <Spinner size="sm" /> : <Icon name="send" />} <span>{submitting ? "Assigning…" : "Confirm & assign"}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Lists */}
      <section className="mc-card mc-list" aria-label="Tasks">
        {isExpandedTab && (
          <div className="mc-critical-bar">
            <button type="button" className="btn btn-light btn-sm" onClick={() => setListTab(tabBeforeCritical)}>
              <Icon name="arrow-left" /> <span>Back</span>
            </button>
          </div>
        )}
        <div className="mc-list-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={listTab === "mine"} className={listTab === "mine" ? "is-active" : ""} onClick={() => setListTab("mine")}>
            Assigned to me {myPendingCount > 0 && <span className="mc-count">{myPendingCount}</span>}
          </button>
          <button type="button" role="tab" aria-selected={listTab === "given"} className={listTab === "given" ? "is-active" : ""} onClick={() => setListTab("given")}>
            Assigned by me <span className="mc-count is-muted">{givenTasks.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={listTab === "mytask"} className={listTab === "mytask" ? "is-active" : ""}
            onClick={() => openExpandedTab("mytask")}>
            My Task{" "}
            {myTaskDemos.items.length > 0 && (
              <span className="mc-count" title="Demos in the next 3 days that need follow-up (D-1 to D-3)"
                aria-label={`${myTaskDemos.items.length} demos need follow-up`}>
                {myTaskDemos.items.length}
              </span>
            )}
          </button>
          <button type="button" role="tab" aria-selected={listTab === "critical"} className={listTab === "critical" ? "is-active" : ""}
            onClick={() => openExpandedTab("critical")}>
            Critical{" "}
            {criticalTasks.length > 0 && (
              <span className="mc-count" title="Incomplete tasks due from tomorrow onward (D+1 … D+N)"
                aria-label={`${criticalTasks.length} critical tasks`}>
                {criticalTasks.length}
              </span>
            )}
          </button>
        </div>
        {listTab === "mytask" ? (
          <MyTaskDemoList items={myTaskDemos.items} state={myTaskDemos.state} load={myTaskDemos.load} />
        ) : listTab === "critical" ? (
          <CriticalTaskList tasks={criticalTasks} tasksState={tasksState} loadTasks={loadTasks}
            completeTask={completeTask} completingId={completingId} />
        ) : tasksState.loading && tasks.length === 0 ? (
          <div className="mc-state" role="status"><Spinner size="sm" color="primary" /> Loading tasks…</div>
        ) : tasksState.error ? (
          <div className="mc-state is-error" role="alert">
            <Icon name="alert-circle" /> {tasksState.error}
            <button type="button" className="btn btn-sm btn-light" onClick={loadTasks}>Retry</button>
          </div>
        ) : listed.length === 0 ? (
          <div className="mc-state">
            <Icon name="check-round-cut" />
            {listTab === "mine" ? "No tasks have been assigned to you." : "You have not assigned any tasks yet."}
          </div>
        ) : (
          <div className="mc-task-list">
            {listed.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                mode={listTab}
                onComplete={completeTask}
                completing={completingId === task.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────────
const MyCalendar = () => {
  const location = useLocation();
  const history = useHistory();
  const params = new URLSearchParams(location.search);
  const tab = params.get("tab") === "tasks" ? "tasks" : "calendar";
  const role = localStorage.getItem("userRole")?.trim().toLowerCase();
  const allowed = role && !EXCLUDED_ROLES.includes(role);

  const setTab = (next) => history.replace({ pathname: location.pathname, search: next === "tasks" ? "?tab=tasks" : "" });

  return (
    <React.Fragment>
      <Head title="My Calendar" />
      <Content>
        <div className="my-calendar">
          <div className="mc-head">
            <div>
              <h3 className="mc-title">My Calendar</h3>
              <p className="mc-sub">Your demo classes and the tasks assigned to and by you.</p>
            </div>
          </div>
          {!allowed ? (
            <Block>
              <div className="mc-state is-error"><Icon name="lock-alt" /> My Calendar is not available for your role.</div>
            </Block>
          ) : (
            <Block>
              <div className="mc-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === "calendar"} className={tab === "calendar" ? "is-active" : ""} onClick={() => setTab("calendar")}>
                  <Icon name="calendar-booking" /> <span>Demo Calendar</span>
                </button>
                <button type="button" role="tab" aria-selected={tab === "tasks"} className={tab === "tasks" ? "is-active" : ""} onClick={() => setTab("tasks")}>
                  <Icon name="task" /> <span>Tasks</span>
                </button>
              </div>
              {tab === "calendar" ? <DemoCalendar /> : <TaskPanel />}
            </Block>
          )}
        </div>
        <ToastContainer />
      </Content>
    </React.Fragment>
  );
};

export default MyCalendar;
