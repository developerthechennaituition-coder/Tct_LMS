import React, { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import bootstrapPlugin from "@fullcalendar/bootstrap";
import { Spinner } from "reactstrap";
import moment from "moment";
import { getUserAvailableSlots } from "../../../apiservices/UserService";

// Week view of one person's free time: their saved availability (with dated exceptions) minus the
// classes already booked for them, which are shown separately as "Booked".
// Shown on "Request for Re-schedule": the student's slots to a tutor, the tutor's slots to a student.
// roleLabel ("student" / "tutor") is used in messages. onSelectSlot(start, end) runs when a free slot is clicked.
const AvailabilityCalendar = ({ userId, name, roleLabel, initialDate, onSelectSlot }) => {
  const [slots, setSlots] = useState([]);
  const [booked, setBooked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);

  const loadRange = async ({ start, end }) => {
    const current = ++request.current;
    setLoading(true);
    setError("");
    try {
      // FullCalendar's end is exclusive; the API's `to` is inclusive.
      const response = await getUserAvailableSlots(
        userId,
        moment(start).format("YYYY-MM-DD"),
        moment(end).subtract(1, "day").format("YYYY-MM-DD"),
      );
      if (current !== request.current) return;
      setSlots(response?.available ?? []);
      setBooked(response?.booked ?? []);
    } catch (e) {
      if (current !== request.current) return;
      setSlots([]);
      setBooked([]);
      setError(`Unable to load the ${roleLabel}'s availability. Please retry.`);
    } finally {
      if (current === request.current) setLoading(false);
    }
  };

  const events = [
    ...slots.map((slot) => ({
      title: "Available",
      start: slot.startTime,
      end: slot.endTime,
      backgroundColor: "#1ee0ac",
      borderColor: "#16b38a",
      textColor: "#fff",
      extendedProps: { free: true },
    })),
    ...booked.map((slot) => ({
      title: "Booked",
      start: slot.startTime,
      end: slot.endTime,
      backgroundColor: "#8094ae",
      borderColor: "#6a7d96",
      textColor: "#fff",
      extendedProps: { free: false },
    })),
  ];

  return (
    <div className="border rounded p-2 mb-3">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <h6 className="overline-title mb-0">{name ? `${name}'s available slots` : `The ${roleLabel}'s available slots`}</h6>
        {loading && <Spinner size="sm" />}
      </div>
      <small className="text-muted d-block mb-2">
        Green: free time. Grey: classes already booked.
        {onSelectSlot ? " Click a green slot to add it to the comments as the preferred re-schedule time." : ""}
      </small>
      {error && <p className="text-danger small mb-2">{error}</p>}
      {!loading && !error && slots.length === 0 && (
        <p className="text-soft small mb-2">The {roleLabel} has no available slots this week.</p>
      )}
      <FullCalendar
        key={userId}
        plugins={[timeGridPlugin, interactionPlugin, bootstrapPlugin]}
        initialView="timeGridWeek"
        initialDate={initialDate}
        themeSystem="bootstrap"
        headerToolbar={{ left: "title", center: null, right: "prev,next" }}
        allDaySlot={false}
        scrollTime="08:00:00"
        height={360}
        nowIndicator
        events={events}
        datesSet={loadRange}
        eventClick={(info) => info.event.extendedProps.free && onSelectSlot && onSelectSlot(info.event.start, info.event.end)}
      />
    </div>
  );
};

export default AvailabilityCalendar;
