import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import bootstrapPlugin from "@fullcalendar/bootstrap";
import moment from "moment";
import { Button, Col, FormGroup, Input, Label, Row, Spinner } from "reactstrap";
import { toast, ToastContainer } from "react-toastify";
import Swal from "sweetalert2";
import { Block, BlockHead, BlockHeadContent, BlockTitle, PreviewAltCard } from "../../../components/Component";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import OpsScheduleCalendar from "./OpsScheduleCalendar";
import {
  addWeeklyDayChange,
  decideScheduleChangeRequest,
  getAllScheduleChangeRequests,
  getScheduleChangeRequests,
  getScheduleCalendarEnrolments,
  getScheduleCalendarEvents,
  getScheduleCalendarTutors,
} from "../../../apiservices/ScheduleService";

// Accounts Admin has the same Schedule Calendar as Operations.
const EDITOR_ROLES = ["Operations", "OperationsAdmin", "OperationAdmin", "AccountsAdmin", "SuperAdmin", "Admin"];
const SELF_SCHEDULE_ROLES = ["Tutor", "Student"];
const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];
const DURATIONS = [
  { value: 1, label: "1 week" },
  { value: 2, label: "2 weeks" },
  { value: 3, label: "3 weeks" },
  { value: 4, label: "4 weeks" },
  { value: 0, label: "Permanent" },
];
const KINDS = {
  Regular: { label: "Regular class", color: "#6576ff" },
  Temporary: { label: "Added for 1-4 weeks", color: "#f4bd0e" },
  OneTime: { label: "One-time class", color: "#09c2de" },
  TutorBusy: { label: "Tutor busy (other student)", color: "#b7c2d0" },
  StudentBusy: { label: "Student busy (other subject)", color: "#e5e9f2" },
};

// Schedule Calendar: Operations choose a tutor and one of the tutor's students, see that student's
// classes, and add weekday(s) for 1-4 weeks or permanently. Tutors and students ask for the same on their own
// classes; Operations approve or reject the request here (or from the notification), and only then are classes added.
const TCTScheduleCalendar = () => {
  const role = localStorage.getItem("userRole");
  // canEdit: Operations (any tutor). canSchedule: also tutors and students, for their own classes.
  const canEdit = EDITOR_ROLES.includes(role);
  const canSchedule = canEdit || SELF_SCHEDULE_ROLES.includes(role);
  const [tutors, setTutors] = useState([]);
  const [tutorId, setTutorId] = useState("");
  const [enrolments, setEnrolments] = useState([]);
  const [salesDetailsId, setSalesDetailsId] = useState("");
  const [events, setEvents] = useState([]);
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ days: [], startTime: "19:00", endTime: "20:00", fromDate: moment().format("YYYY-MM-DD"), weeks: 1 });
  const query = new URLSearchParams(window.location.search);
  // Two tabs: "schedule" (calendar and add class days) and "requests" (tutor/student requests; Operations decide).
  const [tab, setTab] = useState(query.get("tab") === "requests" ? "requests" : "schedule");
  const [requests, setRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  // Operations start on the requests waiting for them; tutors and students see all of theirs.
  const [pendingOnly, setPendingOnly] = useState(EDITOR_ROLES.includes(role));
  const calendarRef = useRef(null);
  // Operations: tutor/enrolment (and optionally a request to modify) to open on the Schedule tab.
  const [opsPreselect, setOpsPreselect] = useState(null);
  // Accounts Admin: Requests tab filtered by the month the requested classes start ("" = all months).
  const isAccountsAdmin = role === "AccountsAdmin";
  const [requestMonth, setRequestMonth] = useState(isAccountsAdmin ? moment().format("YYYY-MM") : "");
  const visibleRequests = requestMonth
    ? requests.filter((r) => moment(r.fromDate).format("YYYY-MM") === requestMonth)
    : requests;
  const shiftRequestMonth = (step) =>
    setRequestMonth((m) => moment(m || moment().format("YYYY-MM"), "YYYY-MM").add(step, "month").format("YYYY-MM"));
  // ?salesDetailsId=... (from a decision notification): open that enrolment once its list has loaded.
  const linkedSalesDetailsId = useRef(query.get("salesDetailsId") || "");

  const enrolment = useMemo(() => enrolments.find((e) => e.salesDetailsId === salesDetailsId), [enrolments, salesDetailsId]);

  // Select the linked enrolment when it is in the loaded list (only once).
  const selectLinked = (list) => {
    const linked = linkedSalesDetailsId.current.toLowerCase();
    const match = linked && list.find((e) => String(e.salesDetailsId).toLowerCase() === linked);
    if (match) {
      linkedSalesDetailsId.current = "";
      setSalesDetailsId(match.salesDetailsId);
    }
  };

  useEffect(() => {
    if (canEdit) {
      // Operations (OpsScheduleCalendar loads its own tutors/students): the linked enrolment's tutor comes from its requests.
      if (linkedSalesDetailsId.current) {
        const linked = linkedSalesDetailsId.current;
        getScheduleChangeRequests(linked)
          .then((data) => {
            const linkedTutor = Array.isArray(data) ? data.find((r) => r.tutorId)?.tutorId : null;
            if (linkedTutor) setOpsPreselect({ tutorId: linkedTutor, salesDetailsId: linked, nonce: Date.now() });
          })
          .catch(() => {});
      }
    } else {
      getScheduleCalendarEnrolments()
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setEnrolments(list);
          selectLinked(list);
        })
        .catch(() => toast.error("Unable to load your classes."));
    }
  }, [canEdit]);

  useEffect(() => {
    if (!canEdit) return;
    setSalesDetailsId("");
    setEnrolments([]);
    if (!tutorId) return;
    getScheduleCalendarEnrolments(tutorId)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setEnrolments(list);
        selectLinked(list);
      })
      .catch(() => toast.error("Unable to load this tutor's students."));
  }, [canEdit, tutorId]);

  // Requests tab: every request (Operations) or the user's own; "Waiting" filter shows only pending ones.
  const loadRequests = useCallback(async () => {
    try {
      const data = await getAllScheduleChangeRequests(pendingOnly);
      setRequests(Array.isArray(data) ? data : []);
      const pending = pendingOnly ? data : await getAllScheduleChangeRequests(true);
      setPendingCount(Array.isArray(pending) ? pending.length : 0);
    } catch (e) {
      setRequests([]);
    }
  }, [pendingOnly]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // "View calendar" on a request: open the Schedule tab on that enrolment.
  const openEnrolment = (request) => {
    setTab("schedule");
    if (!canEdit) return setSalesDetailsId(request.salesDetailsId);
    // Operations: open the tutor's and the student's calendars.
    setOpsPreselect({ tutorId: request.tutorId, salesDetailsId: request.salesDetailsId, nonce: Date.now() });
    return;
    if (request.tutorId && String(request.tutorId).toLowerCase() === String(tutorId).toLowerCase()) {
      setSalesDetailsId(request.salesDetailsId);
    } else {
      linkedSalesDetailsId.current = request.salesDetailsId;
      setTutorId(request.tutorId || "");
    }
  };

  // Operations: approve (classes are added now) or reject a tutor's/student's request.
  const decide = async (request, approve) => {
    const { isConfirmed, value } = await Swal.fire({
      title: approve ? "Approve this request?" : "Reject this request?",
      text: request.summary || "",
      input: "textarea",
      inputPlaceholder: "Comment (optional)",
      showCancelButton: true,
      confirmButtonText: approve
        ? request.requestKind === "PermanentReschedule" ? "Approve and move classes" : "Approve and add classes"
        : "Reject",
      confirmButtonColor: approve ? "#1ee0ac" : "#e85347",
    });
    if (!isConfirmed) return;
    try {
      const result = await decideScheduleChangeRequest(request.id, approve, value || "");
      toast.success(result?.message || (approve ? "Approved." : "Rejected."));
      await loadRequests();
      // The approved classes show on the Schedule tab when that enrolment is open.
      if (approve && request.salesDetailsId === salesDetailsId) {
        const refreshed = await getScheduleCalendarEnrolments(tutorId);
        setEnrolments(Array.isArray(refreshed) ? refreshed : []);
        await loadEvents();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to update the request.");
    }
  };

  const loadEvents = useCallback(async () => {
    if (!salesDetailsId || !range) return setEvents([]);
    setLoading(true);
    try {
      const data = await getScheduleCalendarEvents(salesDetailsId, range.from, range.to);
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      setEvents([]);
      toast.error("Unable to load the schedule.");
    } finally {
      setLoading(false);
    }
  }, [salesDetailsId, range]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const calendarEvents = events.map((e, index) => {
    const kind = KINDS[e.kind] || KINDS.OneTime;
    const busy = e.kind === "TutorBusy" || e.kind === "StudentBusy";
    return {
      id: e.scheduleDetailsId || `busy-${index}`,
      title: busy ? kind.label : `${enrolment?.subject || "Class"}${e.status ? ` · ${e.status}` : ""}`,
      start: e.start,
      end: e.end,
      backgroundColor: kind.color,
      borderColor: kind.color,
      textColor: busy ? "#526484" : "#fff",
      // Full time range ("7:00 PM - 8:00 PM") instead of the calendar's short "7p".
      extendedProps: {
        timeText: `${moment(e.start).format("h:mm A")} - ${moment(e.end).format("h:mm A")}`,
        color: kind.color,
        textColor: busy ? "#526484" : "#fff",
      },
    };
  });

  // Our own event box: the site theme paints every calendar event purple, which hid the legend colours.
  const renderEvent = (arg) => {
    const { timeText, color, textColor } = arg.event.extendedProps;
    return (
      <div
        title={`${timeText} · ${arg.event.title}`}
        style={{ background: color, color: textColor, borderRadius: 3, padding: "2px 4px", width: "100%", overflow: "hidden", fontSize: 11, lineHeight: 1.3 }}
      >
        <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{timeText}</div>
        <div style={{ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{arg.event.title}</div>
      </div>
    );
  };

  const toggleDay = (value) =>
    setForm((f) => ({ ...f, days: f.days.includes(value) ? f.days.filter((d) => d !== value) : [...f.days, value] }));

  const save = async () => {
    if (!salesDetailsId) return toast.error("Select a student first.");
    if (form.days.length === 0) return toast.error("Select at least one day.");
    setSaving(true);
    try {
      const result = await addWeeklyDayChange({ salesDetailsId, ...form, weeks: Number(form.weeks) });
      setForm((f) => ({ ...f, days: [] }));
      // Tutor / student: nothing is added yet; the request waits for Operations.
      if (result?.pendingApproval) {
        toast.info(result.message || "Request sent to Operations.");
        await loadRequests();
        return;
      }
      toast.success(result?.message || "Schedule updated.");
      const refreshed = await getScheduleCalendarEnrolments(canEdit ? tutorId : undefined);
      setEnrolments(Array.isArray(refreshed) ? refreshed : []);
      await loadEvents();
      calendarRef.current?.getApi().gotoDate(form.fromDate);
    } catch (error) {
      const data = error?.response?.data;
      toast.error(data?.message || (typeof data === "string" ? data : null) || "Unable to update the schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head title="Schedule Change" />
      <Content>
        <BlockHead size="sm">
          <BlockHeadContent>
            <BlockTitle page>Schedule Change</BlockTitle>
            <p className="text-soft">
              {canEdit
                ? "Choose a tutor and a student to see each one's calendar, then Edit to add class days for a subject they share."
                : role === "Tutor"
                ? "Choose one of your students to see the classes and request extra class days (Operations approve them)."
                : "Choose your tutor and subject to see the classes and request extra class days (Operations approve them)."}
            </p>
          </BlockHeadContent>
        </BlockHead>

        <Block>
          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button type="button" className={`nav-link ${tab === "schedule" ? "active" : ""}`} onClick={() => setTab("schedule")}>
                Schedule
              </button>
            </li>
            <li className="nav-item">
              <button type="button" className={`nav-link ${tab === "requests" ? "active" : ""}`} onClick={() => setTab("requests")}>
                {canEdit ? "Requests to approve" : "My requests"}
                {pendingCount > 0 && <span className="badge bg-warning ms-1">{pendingCount}</span>}
              </button>
            </li>
          </ul>

          {tab === "schedule" && canEdit && (
            <OpsScheduleCalendar
              preselect={opsPreselect}
              onRequestModified={() => {
                setOpsPreselect((p) => (p ? { ...p, request: null } : p));
                loadRequests();
              }}
            />
          )}

          {tab === "schedule" && !canEdit && (
          <>
          <Row className="g-3 mb-3">
            {canEdit && (
              <Col md="4">
                <Label className="form-label">Tutor</Label>
                <Input type="select" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
                  <option value="">-- Select tutor --</option>
                  {tutors.map((t) => (
                    <option key={t.tutorId} value={t.tutorId}>
                      {t.name}
                    </option>
                  ))}
                </Input>
              </Col>
            )}
            <Col md={canEdit ? "5" : "6"}>
              <Label className="form-label">{canEdit || role === "Tutor" ? "Student & subject" : "Tutor & subject"}</Label>
              <Input type="select" value={salesDetailsId} onChange={(e) => setSalesDetailsId(e.target.value)} disabled={enrolments.length === 0}>
                <option value="">{canEdit && !tutorId ? "-- Select a tutor first --" : "-- Select --"}</option>
                {enrolments.map((e) => (
                  <option key={e.salesDetailsId} value={e.salesDetailsId}>
                    {canEdit || role === "Tutor" ? e.studentName : e.tutorName} - {e.subject}
                  </option>
                ))}
              </Input>
            </Col>
            {enrolment && (
              <Col md="3" className="d-flex align-items-end">
                <div>
                  <div className="text-soft small">Regular weekly classes</div>
                  <strong>{enrolment.weeklyPattern || "No regular weekly schedule"}</strong>
                </div>
              </Col>
            )}
          </Row>

          {canSchedule && enrolment && (
            <PreviewAltCard className="mb-3">
              <h6 className="mb-3">Add class day(s)</h6>
              <Row className="g-3 align-items-end">
                <Col lg="4">
                  <Label className="form-label">Days</Label>
                  <div className="d-flex flex-wrap" style={{ gap: 6 }}>
                    {DAYS.map((d) => (
                      <Button
                        key={d.value}
                        size="sm"
                        type="button"
                        color={form.days.includes(d.value) ? "primary" : "light"}
                        onClick={() => toggleDay(d.value)}
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </Col>
                <Col sm="4" lg="2">
                  <FormGroup className="mb-0">
                    <Label className="form-label">Start time</Label>
                    <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                  </FormGroup>
                </Col>
                <Col sm="4" lg="2">
                  <FormGroup className="mb-0">
                    <Label className="form-label">End time</Label>
                    <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                  </FormGroup>
                </Col>
                <Col sm="4" lg="2">
                  <FormGroup className="mb-0">
                    <Label className="form-label">From date</Label>
                    <Input type="date" value={form.fromDate} min={moment().format("YYYY-MM-DD")} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
                  </FormGroup>
                </Col>
                <Col sm="6" lg="2">
                  <FormGroup className="mb-0">
                    <Label className="form-label">Apply for</Label>
                    <Input type="select" value={form.weeks} onChange={(e) => setForm({ ...form, weeks: Number(e.target.value) })}>
                      {DURATIONS.map((d) => (
                        <option key={d.value} value={d.value} disabled={d.value === 0 && !enrolment.hasWeeklySchedule}>
                          {d.label}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
              <div className="d-flex justify-content-between align-items-center flex-wrap mt-3" style={{ gap: 10 }}>
                <small className="text-soft">
                  {Number(form.weeks) === 0
                    ? "Permanent: the day(s) join the regular weekly schedule and continue in the following months."
                    : `Only the ${form.weeks} week(s) from the chosen date. After that the regular weekly schedule continues as before.`}
                  {!canEdit && " Your request goes to Operations; the classes are added once they approve."}
                </small>
                <Button color="primary" onClick={save} disabled={saving}>
                  {saving ? <Spinner size="sm" /> : canEdit ? "Save schedule" : "Send request"}
                </Button>
              </div>
            </PreviewAltCard>
          )}

          <div className="d-flex flex-wrap mb-2" style={{ gap: 14, fontSize: 12 }}>
            {Object.values(KINDS).map((k) => (
              <span key={k.label} className="d-flex align-items-center">
                <span style={{ width: 12, height: 12, borderRadius: 3, background: k.color, marginRight: 5, display: "inline-block" }} />
                {k.label}
              </span>
            ))}
            {loading && <Spinner size="sm" />}
          </div>

          {salesDetailsId ? (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, bootstrapPlugin]}
              initialView="timeGridWeek"
              themeSystem="bootstrap"
              headerToolbar={{ left: "title prev,next today", center: null, right: "dayGridMonth,timeGridWeek" }}
              allDaySlot={false}
              scrollTime="07:00:00"
              height={650}
              events={calendarEvents}
              eventDisplay="block"
              eventContent={renderEvent}
              dayMaxEvents={4}
              datesSet={(info) =>
                setRange({ from: moment(info.start).format("YYYY-MM-DD"), to: moment(info.end).subtract(1, "day").format("YYYY-MM-DD") })
              }
            />
          ) : (
            <p className="text-soft text-center py-5">{canEdit ? "Select a tutor and a student to see the schedule." : "Select a class to see its schedule."}</p>
          )}
          </>
          )}

          {tab === "requests" && (
            <PreviewAltCard>
              <div className="d-flex justify-content-between align-items-center flex-wrap mb-3" style={{ gap: 10 }}>
                <h6 className="mb-0">
                  {canEdit ? "Requests from tutors and students to add class days" : "Your requests to add class days"}
                </h6>
                <div className="d-flex align-items-center flex-wrap" style={{ gap: 10 }}>
                {isAccountsAdmin && (
                  <div className="d-flex align-items-center" style={{ gap: 6 }}>
                    <span className="text-soft small">Classes from</span>
                    <Button size="sm" color="light" onClick={() => shiftRequestMonth(-1)}>‹</Button>
                    <strong style={{ minWidth: 110, textAlign: "center" }}>
                      {requestMonth ? moment(requestMonth, "YYYY-MM").format("MMMM YYYY") : "All months"}
                    </strong>
                    <Button size="sm" color="light" onClick={() => shiftRequestMonth(1)}>›</Button>
                    <Button size="sm" color={requestMonth ? "light" : "primary"} onClick={() => setRequestMonth(requestMonth ? "" : moment().format("YYYY-MM"))}>
                      {requestMonth ? "All months" : "This month"}
                    </Button>
                  </div>
                )}
                <div className="btn-group">
                  <Button size="sm" color={pendingOnly ? "primary" : "light"} onClick={() => setPendingOnly(true)}>
                    Waiting ({pendingCount})
                  </Button>
                  <Button size="sm" color={!pendingOnly ? "primary" : "light"} onClick={() => setPendingOnly(false)}>
                    All
                  </Button>
                </div>
                </div>
              </div>
              {visibleRequests.length === 0 ? (
                <p className="text-soft text-center py-4 mb-0">
                  {requestMonth
                    ? `No ${pendingOnly ? "waiting " : ""}requests for classes from ${moment(requestMonth, "YYYY-MM").format("MMMM YYYY")}.`
                    : pendingOnly ? "No requests are waiting for approval." : "No requests yet."}
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Tutor</th>
                        <th>Subject</th>
                        <th>Requested by</th>
                        <th>Classes</th>
                        <th>Sent on</th>
                        <th>Status</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRequests.map((r) => (
                        <tr key={r.id}>
                          <td>{r.studentName}</td>
                          <td>{r.tutorName}</td>
                          <td>{r.subject}</td>
                          <td>
                            {r.requesterName} <span className="text-soft">({r.requesterType === "tutor" ? "Tutor" : "Student"})</span>
                          </td>
                          <td>
                            {r.requestKind === "PermanentReschedule" && <span className="badge bg-info me-1">Permanent re-schedule</span>}
                            {r.summary}
                            {r.decisionComment && <div className="text-soft small">Comment: {r.decisionComment}</div>}
                          </td>
                          <td className="text-nowrap">{moment.utc(r.createdDate).local().format("DD-MMM-YYYY hh:mm A")}</td>
                          <td>
                            <span
                              className={`badge ${
                                r.status === "Pending" ? "bg-warning" : r.status === "Approved" ? "bg-success" : "bg-danger"
                              }`}
                            >
                              {r.status === "Pending" ? "Waiting for Operations" : r.status}
                            </span>
                          </td>
                          <td className="text-end text-nowrap">
                            {canEdit && r.status === "Pending" && (
                              <>
                                <Button size="sm" color="success" className="me-1" onClick={() => decide(r, true)}>
                                  Approve
                                </Button>
                                {r.requestKind !== "PermanentReschedule" && (
                                  <Button
                                    size="sm"
                                    color="primary"
                                    outline
                                    className="me-1"
                                    onClick={() => {
                                      setTab("schedule");
                                      setOpsPreselect({ tutorId: r.tutorId, salesDetailsId: r.salesDetailsId, request: r, nonce: Date.now() });
                                    }}
                                  >
                                    Modify
                                  </Button>
                                )}
                                <Button size="sm" color="danger" outline className="me-1" onClick={() => decide(r, false)}>
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button size="sm" color="light" onClick={() => openEnrolment(r)}>
                              View calendar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PreviewAltCard>
          )}
        </Block>
      </Content>
      <ToastContainer />
    </>
  );
};

export default TCTScheduleCalendar;
