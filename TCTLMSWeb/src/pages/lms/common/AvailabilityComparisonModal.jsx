import React, { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import bootstrapPlugin from "@fullcalendar/bootstrap";
import { Modal, ModalHeader, ModalBody, Button, Spinner, Badge } from "reactstrap";
import moment from "moment";
import { getAvailabilityComparison } from "../../../apiservices/UserService";

const COLORS = {
  common: { bg: "#1ee0ac", border: "#16b38a" },
  student: { bg: "#09c2de", border: "#0799ae" },
  tutor: { bg: "#f4bd0e", border: "#d3a20a" },
  classItself: { bg: "#8094ae", border: "#6a7d96" },
};

const PREFERRED_PREFIX = "Preferred re-schedule slot:";
const fmt = (t) => moment(t).format("hh:mm A");
const range = (s) => `${fmt(s.startTime)} - ${fmt(s.endTime)}`;

// "Preferred re-schedule slot: Tue 20-Oct-2026 04:00 PM - 05:00 PM", written by the availability
// calendar when the requester clicks a slot. Returns { start, end } or null.
const parsePreferredSlot = (comment) => {
  const line = (comment || "").split("\n").find((l) => l.startsWith(PREFERRED_PREFIX));
  const match = line?.slice(PREFERRED_PREFIX.length).trim().match(/^(.+?) (\d{2}:\d{2} [AP]M) - (\d{2}:\d{2} [AP]M)$/);
  if (!match) return null;
  const start = moment(`${match[1]} ${match[2]}`, "ddd DD-MMM-YYYY hh:mm A", true);
  const end = moment(`${match[1]} ${match[3]}`, "ddd DD-MMM-YYYY hh:mm A", true);
  return start.isValid() && end.isValid() ? { start: start.toDate(), end: end.toDate() } : null;
};

const covers = (slots, start, end) =>
  slots.some((s) => new Date(s.startTime) <= start && new Date(s.endTime) >= end);

// Operations view of a "Request for Re-schedule": the student's and tutor's free time for a week,
// split into both-free / student-only / tutor-only, with a day-by-day summary.
// classEvent: the calendar event (studentUserId, tutorUserId, names, start/end, comments);
// requestedBy: "tutor" | "student".
const AvailabilityComparisonModal = ({ isOpen, classEvent, requestedBy, onClose, onOpenClass }) => {
  const [data, setData] = useState(null);
  const [loadedRange, setLoadedRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);

  const studentName = classEvent?.studentName || "Student";
  const tutorName = classEvent?.tutorName || "Tutor";
  const requesterComment = requestedBy === "tutor" ? classEvent?.tutorComment : classEvent?.studentComment;
  const preferred = parsePreferredSlot(requesterComment);

  const loadRange = async ({ start, end }) => {
    const current = ++request.current;
    setLoading(true);
    setError("");
    try {
      // FullCalendar's end is exclusive; the API's `to` is inclusive.
      const response = await getAvailabilityComparison(
        classEvent.studentUserId,
        classEvent.tutorUserId,
        moment(start).format("YYYY-MM-DD"),
        moment(end).subtract(1, "day").format("YYYY-MM-DD"),
      );
      if (current !== request.current) return;
      setData(response);
      setLoadedRange({ start, end });
    } catch (e) {
      if (current !== request.current) return;
      setData(null);
      setError("Unable to load the student's and tutor's availability. Please retry.");
    } finally {
      if (current === request.current) setLoading(false);
    }
  };

  const common = data?.common ?? [];
  const studentOnly = data?.studentOnly ?? [];
  const tutorOnly = data?.tutorOnly ?? [];

  const toEvents = (slots, title, color) =>
    slots.map((s) => ({ title, start: s.startTime, end: s.endTime, backgroundColor: color.bg, borderColor: color.border, textColor: "#fff" }));
  const events = [
    ...toEvents(common, "Both free", COLORS.common),
    ...toEvents(studentOnly, "Student free, tutor not", COLORS.student),
    ...toEvents(tutorOnly, "Tutor free, student not", COLORS.tutor),
    ...(classEvent?.start
      ? [{ title: "This class", start: classEvent.start, end: classEvent.end, backgroundColor: COLORS.classItself.bg, borderColor: COLORS.classItself.border, textColor: "#fff" }]
      : []),
  ];

  // Day-by-day summary for the loaded week.
  const days = [];
  if (loadedRange) {
    for (let d = moment(loadedRange.start); d.isBefore(loadedRange.end); d.add(1, "day")) {
      const onDay = (slots) => slots.filter((s) => moment(s.startTime).isSame(d, "day"));
      days.push({ date: d.clone(), common: onDay(common), studentOnly: onDay(studentOnly), tutorOnly: onDay(tutorOnly) });
    }
  }

  // Where the requester's preferred slot falls, once its week is loaded.
  let preferredVerdict = null;
  if (preferred && loadedRange && preferred.start >= loadedRange.start && preferred.start < loadedRange.end) {
    if (covers(common, preferred.start, preferred.end)) preferredVerdict = { color: "success", text: "Both the student and the tutor are free at this time." };
    else if (covers(data?.student?.available ?? [], preferred.start, preferred.end))
      preferredVerdict = { color: "warning", text: `${studentName} is free, but ${tutorName} is not available at this time.` };
    else if (covers(data?.tutor?.available ?? [], preferred.start, preferred.end))
      preferredVerdict = { color: "warning", text: `${tutorName} is free, but ${studentName} is not available at this time.` };
    else preferredVerdict = { color: "danger", text: "Neither the student nor the tutor is fully free at this time." };
  }

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="xl" className="modal-dialog-centered">
      <ModalHeader toggle={onClose}>Re-schedule request: availability check</ModalHeader>
      <ModalBody>
        <p className="mb-1">
          <strong>{classEvent?.subjectName}</strong> class on{" "}
          <strong>{classEvent?.start ? moment(classEvent.start).format("ddd DD-MMM-YYYY hh:mm A") : ""}</strong>
        </p>
        <p className="mb-2">
          Student: <strong>{studentName}</strong> &nbsp;|&nbsp; Tutor: <strong>{tutorName}</strong> &nbsp;|&nbsp; Requested by:{" "}
          <Badge color="primary">{requestedBy === "tutor" ? `Tutor (${tutorName})` : `Student (${studentName})`}</Badge>
        </p>

        {preferred && (
          <div className={`alert alert-${preferredVerdict?.color ?? "light"} py-2`}>
            Preferred slot: <strong>{moment(preferred.start).format("ddd DD-MMM-YYYY hh:mm A")} - {fmt(preferred.end)}</strong>
            <br />
            {preferredVerdict ? preferredVerdict.text : "Go to that week to check it."}
          </div>
        )}

        {error && <p className="text-danger">{error}</p>}
        {data && !loading && common.length === 0 && (
          <div className="alert alert-danger py-2">
            No common free time this week: the student's and tutor's timings do not match. Please contact them, or check another week.
          </div>
        )}

        <div className="d-flex flex-wrap align-items-center mb-2" style={{ gap: "12px", fontSize: "12px" }}>
          {[["Both free", COLORS.common], ["Student free, tutor not", COLORS.student], ["Tutor free, student not", COLORS.tutor], ["This class", COLORS.classItself]].map(([label, color]) => (
            <span key={label} className="d-flex align-items-center">
              <span style={{ width: 12, height: 12, borderRadius: 3, background: color.bg, marginRight: 5, display: "inline-block" }} />
              {label}
            </span>
          ))}
          {loading && <Spinner size="sm" />}
        </div>

        {isOpen && classEvent && (
          <FullCalendar
            plugins={[timeGridPlugin, bootstrapPlugin]}
            initialView="timeGridWeek"
            initialDate={preferred?.start ?? classEvent.start}
            themeSystem="bootstrap"
            headerToolbar={{ left: "title", center: null, right: "prev,next" }}
            allDaySlot={false}
            scrollTime="08:00:00"
            height={380}
            nowIndicator
            events={events}
            datesSet={loadRange}
          />
        )}

        {days.length > 0 && (
          <div className="table-responsive mt-3">
            <table className="table table-sm table-bordered mb-0" style={{ fontSize: "12px" }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Both free</th>
                  <th>Student free, tutor not</th>
                  <th>Tutor free, student not</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.date.format("YYYY-MM-DD")} className={day.common.length === 0 && (day.studentOnly.length || day.tutorOnly.length) ? "table-warning" : ""}>
                    <td className="text-nowrap">{day.date.format("ddd DD-MMM")}</td>
                    <td>{day.common.length ? day.common.map(range).join(", ") : <span className="text-soft">-</span>}</td>
                    <td>{day.studentOnly.length ? day.studentOnly.map(range).join(", ") : <span className="text-soft">-</span>}</td>
                    <td>{day.tutorOnly.length ? day.tutorOnly.map(range).join(", ") : <span className="text-soft">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="d-flex justify-content-end mt-3" style={{ gap: "10px" }}>
          <Button color="primary" onClick={onOpenClass}>View class details</Button>
          <Button color="danger" className="btn-dim" onClick={onClose}>Close</Button>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default AvailabilityComparisonModal;
