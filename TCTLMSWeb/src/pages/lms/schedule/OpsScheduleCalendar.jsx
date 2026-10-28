import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import bootstrapPlugin from "@fullcalendar/bootstrap";
import moment from "moment";
import { Button, Col, FormGroup, Input, Label, Row, Spinner } from "reactstrap";
import { toast } from "react-toastify";
import { PreviewAltCard } from "../../../components/Component";
import {
  addWeeklyDayChange,
  getScheduleCalendarEnrolments,
  getScheduleCalendarPersonEvents,
  getScheduleCalendarStudents,
  getScheduleCalendarTutors,
  modifyScheduleChangeRequest,
} from "../../../apiservices/ScheduleService";

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
  Demo: { label: "Demo", color: "#816bff" },
  New: { label: "New class (free)", color: "#1ee0ac" },
  Clash: { label: "New class (clash)", color: "#e85347" },
};
const emptyForm = () => ({ salesDetailsId: "", days: [], startTime: "19:00", endTime: "20:00", fromDate: moment().format("YYYY-MM-DD"), weeks: 1 });
const sameId = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();

// Operations' Schedule tab: a tutor calendar and a student calendar chosen independently (side by side, moving
// together). "Edit" below them adds class day(s) for a subject the two share; from a request's "Modify" the edit is
// pre-filled with the request and saving it approves the request with the changed values.
// preselect: { tutorId, salesDetailsId, request?, nonce } from the Requests tab or a notification link.
const OpsScheduleCalendar = ({ preselect, onRequestModified }) => {
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [tutorId, setTutorId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [tutorEnrolments, setTutorEnrolments] = useState([]);
  const [tutorEvents, setTutorEvents] = useState([]);
  const [studentEvents, setStudentEvents] = useState([]);
  const [range, setRange] = useState(null);
  const [title, setTitle] = useState("");
  const [view, setView] = useState("timeGridWeek");
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [modifyRequest, setModifyRequest] = useState(null);
  const [saving, setSaving] = useState(false);
  const tutorCalendar = useRef(null);
  const studentCalendar = useRef(null);
  // A preselected enrolment whose student is set once the tutor's enrolments have loaded.
  const pending = useRef(null);

  useEffect(() => {
    getScheduleCalendarTutors().then((d) => setTutors(Array.isArray(d) ? d : [])).catch(() => toast.error("Unable to load tutors."));
    getScheduleCalendarStudents().then((d) => setStudents(Array.isArray(d) ? d : [])).catch(() => toast.error("Unable to load students."));
  }, []);

  // A tutor's enrolments: used to find the subjects this tutor teaches the selected student.
  useEffect(() => {
    setTutorEnrolments([]);
    if (!tutorId) return;
    getScheduleCalendarEnrolments(tutorId)
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setTutorEnrolments(list);
        const p = pending.current;
        const match = p && list.find((e) => sameId(e.salesDetailsId, p.salesDetailsId));
        if (match) {
          pending.current = null;
          setStudentId(match.studentId);
          if (p.request) openModify(p.request);
        }
      })
      .catch(() => toast.error("Unable to load this tutor's students."));
  }, [tutorId]);

  // From the Requests tab (View calendar / Modify) or a notification link.
  useEffect(() => {
    if (!preselect?.tutorId) return;
    pending.current = preselect;
    setEditOpen(false);
    setModifyRequest(null);
    if (sameId(preselect.tutorId, tutorId)) {
      const match = tutorEnrolments.find((e) => sameId(e.salesDetailsId, preselect.salesDetailsId));
      if (match) {
        pending.current = null;
        setStudentId(match.studentId);
        if (preselect.request) openModify(preselect.request);
      }
    } else {
      setTutorId(preselect.tutorId);
    }
  }, [preselect]);

  const studentOptions = useMemo(() => {
    if (!tutorId) return students;
    const ids = new Set(tutorEnrolments.map((e) => String(e.studentId).toLowerCase()));
    return students.filter((s) => ids.has(String(s.studentId).toLowerCase()));
  }, [students, tutorEnrolments, tutorId]);

  // A student who is not one of the newly selected tutor's students is cleared.
  useEffect(() => {
    if (tutorId && studentId && tutorEnrolments.length > 0 && !tutorEnrolments.some((e) => sameId(e.studentId, studentId))) setStudentId("");
  }, [tutorEnrolments]);

  const shared = useMemo(
    () => (studentId ? tutorEnrolments.filter((e) => sameId(e.studentId, studentId)) : []),
    [tutorEnrolments, studentId],
  );
  const selectedEnrolment = shared.find((e) => sameId(e.salesDetailsId, form.salesDetailsId));

  const loadEvents = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        tutorId ? getScheduleCalendarPersonEvents({ tutorId }, range.from, range.to) : Promise.resolve([]),
        studentId ? getScheduleCalendarPersonEvents({ studentId }, range.from, range.to) : Promise.resolve([]),
      ]);
      setTutorEvents(Array.isArray(t) ? t : []);
      setStudentEvents(Array.isArray(s) ? s : []);
    } catch (e) {
      toast.error("Unable to load the calendars.");
    } finally {
      setLoading(false);
    }
  }, [tutorId, studentId, range]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Both calendars move together.
  const both = (action) => [tutorCalendar, studentCalendar].forEach((ref) => ref.current && action(ref.current.getApi()));

  const openEdit = () => {
    setModifyRequest(null);
    setForm({ ...emptyForm(), salesDetailsId: shared.length === 1 ? shared[0].salesDetailsId : "" });
    setEditOpen(true);
  };

  function openModify(request) {
    const fromDate = moment(request.fromDate).format("YYYY-MM-DD");
    setModifyRequest(request);
    setForm({
      salesDetailsId: request.salesDetailsId,
      days: Array.isArray(request.days) ? request.days : [],
      startTime: request.startTime,
      endTime: request.endTime,
      fromDate: moment(fromDate).isBefore(moment(), "day") ? moment().format("YYYY-MM-DD") : fromDate,
      weeks: Number(request.weeks),
    });
    setEditOpen(true);
    setTimeout(() => both((api) => api.gotoDate(fromDate)), 0);
  }

  const toggleDay = (value) =>
    setForm((f) => ({ ...f, days: f.days.includes(value) ? f.days.filter((d) => d !== value) : [...f.days, value] }));

  // The classes the edit would add, within the visible range (Permanent: to the end of the range).
  const proposed = useMemo(() => {
    if (!editOpen || !range || form.days.length === 0 || !form.startTime || !form.endTime) return [];
    const from = moment(form.fromDate);
    const last = Number(form.weeks) > 0 ? from.clone().add(7 * Number(form.weeks) - 1, "days") : moment(range.to);
    const list = [];
    for (let d = moment.max(from, moment(range.from)); d.isSameOrBefore(last, "day") && d.isSameOrBefore(moment(range.to), "day"); d.add(1, "day")) {
      if (!form.days.includes(d.day())) continue;
      list.push({ start: moment(`${d.format("YYYY-MM-DD")}T${form.startTime}`), end: moment(`${d.format("YYYY-MM-DD")}T${form.endTime}`) });
    }
    return list;
  }, [editOpen, range, form]);

  const toCalendarEvents = (events) => {
    const existing = events.map((e) => {
      const kind = KINDS[e.kind] || KINDS.OneTime;
      return {
        id: e.scheduleDetailsId,
        title: `${e.otherName || ""} – ${e.subject}${e.status ? ` · ${e.status}` : ""}`,
        start: e.start,
        end: e.end,
        backgroundColor: kind.color,
        borderColor: kind.color,
        extendedProps: { color: kind.color, timeText: `${moment(e.start).format("h:mm A")} - ${moment(e.end).format("h:mm A")}` },
      };
    });
    const added = proposed.map((p, i) => {
      const clash = events.some((e) => moment(e.start).isBefore(p.end) && moment(e.end).isAfter(p.start));
      const kind = clash ? KINDS.Clash : KINDS.New;
      return {
        id: `new-${i}`,
        title: clash ? "New class – busy at this time" : "New class",
        start: p.start.toDate(),
        end: p.end.toDate(),
        backgroundColor: kind.color,
        borderColor: kind.color,
        extendedProps: { color: kind.color, timeText: `${p.start.format("h:mm A")} - ${p.end.format("h:mm A")}` },
      };
    });
    return [...existing, ...added];
  };

  // Own event box: the site theme paints every calendar event purple.
  const renderEvent = (arg) => {
    const { timeText, color } = arg.event.extendedProps;
    return (
      <div
        title={`${timeText} · ${arg.event.title}`}
        style={{ background: color, color: "#fff", borderRadius: 3, padding: "2px 4px", width: "100%", overflow: "hidden", fontSize: 11, lineHeight: 1.3 }}
      >
        <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{timeText}</div>
        <div style={{ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{arg.event.title}</div>
      </div>
    );
  };

  const calendar = (ref, events, master) => (
    <FullCalendar
      ref={ref}
      plugins={[dayGridPlugin, timeGridPlugin, bootstrapPlugin]}
      initialView={view}
      themeSystem="bootstrap"
      headerToolbar={false}
      allDaySlot={false}
      scrollTime="07:00:00"
      height={560}
      events={toCalendarEvents(events)}
      eventDisplay="block"
      eventContent={renderEvent}
      dayMaxEvents={3}
      datesSet={
        master
          ? (info) => {
              setTitle(info.view.title);
              setRange({ from: moment(info.start).format("YYYY-MM-DD"), to: moment(info.end).subtract(1, "day").format("YYYY-MM-DD") });
            }
          : undefined
      }
    />
  );

  const save = async () => {
    if (!form.salesDetailsId) return toast.error("Select the subject.");
    if (form.days.length === 0) return toast.error("Select at least one day.");
    const payload = { ...form, weeks: Number(form.weeks) };
    setSaving(true);
    try {
      const result = modifyRequest
        ? await modifyScheduleChangeRequest(modifyRequest.id, payload)
        : await addWeeklyDayChange(payload);
      toast.success(result?.message || (modifyRequest ? "Request modified and approved." : "Schedule updated."));
      if (modifyRequest && onRequestModified) onRequestModified();
      setModifyRequest(null);
      setEditOpen(false);
      const refreshed = await getScheduleCalendarEnrolments(tutorId);
      setTutorEnrolments(Array.isArray(refreshed) ? refreshed : []);
      await loadEvents();
    } catch (error) {
      const data = error?.response?.data;
      toast.error(data?.message || (typeof data === "string" ? data : null) || "Unable to update the schedule.");
    } finally {
      setSaving(false);
    }
  };

  const tutorName = tutors.find((t) => sameId(t.tutorId, tutorId))?.name;
  const studentName = students.find((s) => sameId(s.studentId, studentId))?.name;
  const canOpenEdit = tutorId && studentId && shared.length > 0;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3" style={{ gap: 10 }}>
        <div className="d-flex align-items-center" style={{ gap: 6 }}>
          <Button size="sm" color="light" onClick={() => both((api) => api.prev())}>‹</Button>
          <Button size="sm" color="light" onClick={() => both((api) => api.next())}>›</Button>
          <Button size="sm" color="light" onClick={() => both((api) => api.today())}>Today</Button>
          <h6 className="mb-0 ms-2">{title}</h6>
          {loading && <Spinner size="sm" className="ms-2" />}
        </div>
        <div className="btn-group">
          {[
            { value: "timeGridWeek", label: "Week" },
            { value: "dayGridMonth", label: "Month" },
          ].map((v) => (
            <Button
              key={v.value}
              size="sm"
              color={view === v.value ? "primary" : "light"}
              onClick={() => {
                setView(v.value);
                both((api) => api.changeView(v.value));
              }}
            >
              {v.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="d-flex flex-wrap mb-2" style={{ gap: 14, fontSize: 12 }}>
        {Object.values(KINDS).map((k) => (
          <span key={k.label} className="d-flex align-items-center">
            <span style={{ width: 12, height: 12, borderRadius: 3, background: k.color, marginRight: 5, display: "inline-block" }} />
            {k.label}
          </span>
        ))}
      </div>

      <Row className="g-3">
        <Col lg="6">
          <Label className="form-label">Tutor</Label>
          <Input type="select" value={tutorId} onChange={(e) => { setTutorId(e.target.value); setEditOpen(false); setModifyRequest(null); }} disabled={Boolean(modifyRequest)}>
            <option value="">-- Select tutor --</option>
            {tutors.map((t) => (
              <option key={t.tutorId} value={t.tutorId}>
                {t.name}
              </option>
            ))}
          </Input>
          <div className="mt-2 border rounded p-1">
            {!tutorId && <div className="text-soft small p-1">Select a tutor to see all of the tutor's classes.</div>}
            {calendar(tutorCalendar, tutorEvents, true)}
          </div>
        </Col>
        <Col lg="6">
          <Label className="form-label">Student</Label>
          <Input type="select" value={studentId} onChange={(e) => { setStudentId(e.target.value); setEditOpen(false); setModifyRequest(null); }} disabled={Boolean(modifyRequest)}>
            <option value="">{tutorId ? "-- Select one of this tutor's students --" : "-- Select student --"}</option>
            {studentOptions.map((s) => (
              <option key={s.studentId} value={s.studentId}>
                {s.name}
              </option>
            ))}
          </Input>
          <div className="mt-2 border rounded p-1">
            {!studentId && <div className="text-soft small p-1">Select a student to see all of the student's classes.</div>}
            {calendar(studentCalendar, studentEvents, false)}
          </div>
        </Col>
      </Row>

      <div className="d-flex justify-content-between align-items-center flex-wrap mt-3" style={{ gap: 10 }}>
        <small className="text-soft">
          {!tutorId || !studentId
            ? "Select a tutor and a student, then Edit to add class days for a subject they share."
            : shared.length === 0
            ? `${tutorName || "This tutor"} does not teach ${studentName || "this student"}.`
            : `Shared subject(s): ${shared.map((e) => e.subject).join(", ")}`}
        </small>
        {!editOpen && (
          <Button color="primary" onClick={openEdit} disabled={!canOpenEdit}>
            Edit
          </Button>
        )}
      </div>

      {editOpen && (
        <PreviewAltCard className="mt-3">
          <h6 className="mb-1">{modifyRequest ? "Modify request" : "Add class day(s)"}</h6>
          {modifyRequest && (
            <p className="text-soft small mb-3">
              Requested by {modifyRequest.requesterName} ({modifyRequest.requesterType === "tutor" ? "Tutor" : "Student"}): {modifyRequest.summary}.
              Saving approves the request with the values below.
            </p>
          )}
          <Row className="g-3 align-items-end">
            <Col lg="3">
              <Label className="form-label">Subject</Label>
              <Input
                type="select"
                value={form.salesDetailsId}
                disabled={Boolean(modifyRequest)}
                onChange={(e) => setForm({ ...form, salesDetailsId: e.target.value, weeks: form.weeks })}
              >
                <option value="">-- Select subject --</option>
                {shared.map((e) => (
                  <option key={e.salesDetailsId} value={e.salesDetailsId}>
                    {e.subject}
                  </option>
                ))}
              </Input>
              {selectedEnrolment && (
                <div className="text-soft small mt-1">Regular: {selectedEnrolment.weeklyPattern || "no weekly schedule"}</div>
              )}
            </Col>
            <Col lg="3">
              <Label className="form-label">Days</Label>
              <div className="d-flex flex-wrap" style={{ gap: 4 }}>
                {DAYS.map((d) => (
                  <Button key={d.value} size="sm" type="button" color={form.days.includes(d.value) ? "primary" : "light"} onClick={() => toggleDay(d.value)}>
                    {d.label}
                  </Button>
                ))}
              </div>
            </Col>
            <Col sm="4" lg="1">
              <FormGroup className="mb-0">
                <Label className="form-label">Start</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </FormGroup>
            </Col>
            <Col sm="4" lg="1">
              <FormGroup className="mb-0">
                <Label className="form-label">End</Label>
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
                    <option key={d.value} value={d.value} disabled={d.value === 0 && selectedEnrolment && !selectedEnrolment.hasWeeklySchedule}>
                      {d.label}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <div className="d-flex justify-content-between align-items-center flex-wrap mt-3" style={{ gap: 10 }}>
            <small className="text-soft">
              The new classes show on both calendars: green when that person is free, red when they already have a class.
              {Number(form.weeks) === 0
                ? " Permanent: the day(s) join the regular weekly schedule."
                : ` Only the ${form.weeks} week(s) from the chosen date.`}
            </small>
            <div className="d-flex" style={{ gap: 8 }}>
              <Button color="light" onClick={() => { setEditOpen(false); setModifyRequest(null); }} disabled={saving}>
                Cancel
              </Button>
              <Button color="primary" onClick={save} disabled={saving}>
                {saving ? <Spinner size="sm" /> : modifyRequest ? "Save & approve" : "Save schedule"}
              </Button>
            </div>
          </div>
        </PreviewAltCard>
      )}
    </>
  );
};

export default OpsScheduleCalendar;
