import React, { useEffect, useState } from "react";
import {
  CLASS_STORAGE_TIME_ZONE,
  classTimeLabelText,
  timeZoneLabelText,
  useClassUserIds,
  usePersonUserId,
  useUserTimeZone,
} from "../../../library/userTimeZones";

// A person's timezone beside a class date / time (display only; see library/userTimeZones).
// userId must be the person's User.Id. With a class start (and end), shows the class time in that person's
// timezone: "Tutor time: 02-Nov-2026, 6:00–7:00 PM (Asia/Kolkata)". Without one (a screen with no class),
// shows the timezone only: "Timezone: Asia/Kolkata".
const UserTimeZoneLabel = ({ label, userId, start, end, className = "" }) => {
  const result = useUserTimeZone(userId);
  const text = start === undefined ? timeZoneLabelText(result) : classTimeLabelText(result, start, end);
  return (
    <small className={`d-block text-soft ${className}`.trim()}>
      {label}: {text}
    </small>
  );
};

// The other person's row pulses gently (slow background fade, text unchanged); with reduced motion it is a
// still highlight instead.
const PULSE_CSS = `
@keyframes tct-tz-pulse { 0%, 100% { background-color: rgba(101, 118, 255, 0.04); } 50% { background-color: rgba(101, 118, 255, 0.18); } }
.tct-tz-pulse { border-left: 3px solid #6576ff; border-radius: 4px; padding-left: 6px; animation: tct-tz-pulse 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .tct-tz-pulse { animation: none; background-color: rgba(101, 118, 255, 0.12); } }
`;

const CARD_BORDER = "1px solid #e5e9f2";

// One card of the class time block: role icon, who, and the class time in that person's timezone.
// pending: the person's User.Id is still being resolved. pulse: draw attention to this card; it then takes its
// accent left border and background only from .tct-tz-pulse (no inline left border / background, which would
// override the animation's reduced-motion rule), so the existing pulse behaviour is unchanged.
const ClassTimeLine = ({ icon, tone, label, userId, start, end, pending = false, pulse = false }) => {
  const result = useUserTimeZone(pending ? null : userId);
  const cardStyle = {
    flex: "1 1 220px",
    minWidth: 0,
    gap: 8,
    lineHeight: 1.5,
    paddingTop: 6,
    paddingRight: 8,
    paddingBottom: 6,
    borderTop: CARD_BORDER,
    borderRight: CARD_BORDER,
    borderBottom: CARD_BORDER,
    ...(pulse ? {} : { paddingLeft: 8, borderLeft: CARD_BORDER, borderRadius: 4, background: "#fff" }),
  };
  return (
    <div className={`d-flex align-items-start${pulse ? " tct-tz-pulse" : ""}`} style={cardStyle}>
      <span className={`user-avatar xs bg-${tone}-dim`} style={{ flexShrink: 0 }} aria-hidden="true">
        <em className={`icon ni ni-${icon}`} />
      </span>
      <div style={{ minWidth: 0 }}>
        <strong className={`d-block small text-uppercase ${pulse ? "text-primary" : "text-soft"}`} style={{ letterSpacing: "0.04em" }}>
          {label}
          <span className="sr-only">: </span>
        </strong>
        <span className="d-block text-dark" style={{ overflowWrap: "anywhere" }}>
          {pending ? "Loading…" : classTimeLabelText(result, start, end)}
        </span>
      </div>
    </div>
  );
};

// The class time in the tutor's and in the student's timezone, both from the same class start / end.
// calendarGuestType (optional): whose calendar this is; on a tutor's calendar the student row pulses, on a
// student's calendar the tutor row pulses, otherwise (coordinator, operations, …) neither does.
export const UserTimeZoneLabels = ({ tutorUserId, studentUserId, start, end, tutorPending = false, calendarGuestType, className = "" }) => {
  const pulseTutor = calendarGuestType === "student";
  const pulseStudent = calendarGuestType === "tutor";
  return (
    <div className={`bg-lighter rounded px-2 py-2 ${className}`.trim()}>
      {(pulseTutor || pulseStudent) && <style>{PULSE_CSS}</style>}
      <h6 className="overline-title text-soft mb-1">Class time in each person's timezone</h6>
      {/* Side by side when there is room, stacked on narrow screens. */}
      <div className="d-flex flex-wrap" style={{ gap: 6 }}>
        <ClassTimeLine icon="user-alt" tone="primary" label="Tutor" userId={tutorUserId} start={start ?? null} end={end} pending={tutorPending} pulse={pulseTutor} />
        <ClassTimeLine icon="user" tone="info" label="Student" userId={studentUserId} start={start ?? null} end={end} pulse={pulseStudent} />
      </div>
    </div>
  );
};

// Calendar hover card: the class time in the tutor's timezone, from a calendar event (see useClassUserIds).
export const ClassTutorTimeLabel = ({ classEvent, className = "" }) => {
  const { tutorUserId, tutorPending } = useClassUserIds(classEvent);
  const result = useUserTimeZone(tutorPending ? null : tutorUserId);
  return (
    <small className={`d-block ${className}`.trim()}>
      <em className="icon ni ni-globe text-primary mr-1" aria-hidden="true" />
      <strong>Tutor time</strong> · {tutorPending ? "Loading…" : classTimeLabelText(result, classEvent?.start ?? null, classEvent?.end)}
    </small>
  );
};

// ---- Schedule Change page (display only) ----
// kind: "tutor" (personId = Tutor.Id, or a tutor's User.Id) or "student" (personId = Student.Id).

// A person's saved timezone under a selector, with their current local time once it is known:
// "Tutor timezone: Asia/Kolkata · Local time: 6:21 PM".
// A tinted chip: primary tint once the timezone is known, neutral while loading, warning when not set or unavailable.
// The parts wrap instead of being clipped on narrow screens.
const PERSON_TZ_TONES = {
  set: { background: "rgba(101, 118, 255, 0.08)", border: "rgba(101, 118, 255, 0.3)", icon: "#6576ff" },
  pending: { background: "#f5f6fa", border: "#e5e9f2", icon: "#8094ae" },
  warning: { background: "rgba(244, 189, 14, 0.1)", border: "rgba(244, 189, 14, 0.45)", icon: "#c79a0a" },
};

// The current time in an IANA timezone ("2:21 AM"); null when the browser cannot use that timezone,
// so no guessed time is shown.
const localTimeFormatters = new Map();
const localTimeText = (timeZone, date) => {
  try {
    if (!localTimeFormatters.has(timeZone)) {
      localTimeFormatters.set(timeZone, new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true }));
    }
    return localTimeFormatters.get(timeZone).format(date);
  } catch (e) {
    return null;
  }
};

// The current time, refreshed at the start of every minute while enabled.
const useMinuteClock = (enabled) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return undefined;
    setNow(new Date());
    let interval;
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60000);
    }, 60000 - (Date.now() % 60000));
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [enabled]);
  return now;
};

export const PersonTimeZoneLabel = ({ label, kind, personId, className = "" }) => {
  const { userId, pending } = usePersonUserId(kind, personId);
  const result = useUserTimeZone(pending ? null : userId);
  const loading = pending || !result;
  const timeZoneId = !loading && result.status === "set" ? result.timeZoneId : null;
  const now = useMinuteClock(Boolean(timeZoneId));
  const localTime = timeZoneId ? localTimeText(timeZoneId, now) : null;
  const tone = PERSON_TZ_TONES[loading ? "pending" : result.status === "set" ? "set" : "warning"];
  return (
    <div
      className={`d-inline-flex align-items-center small ${className}`.trim()}
      style={{
        gap: 8,
        maxWidth: "100%",
        padding: "5px 12px 5px 6px",
        borderRadius: 8,
        lineHeight: 1.4,
        background: tone.background,
        border: `1px solid ${tone.border}`,
        boxShadow: "0 1px 2px rgba(31, 43, 58, 0.05)",
      }}
      aria-live="polite"
    >
      <span
        className="d-inline-flex align-items-center justify-content-center"
        style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", border: `1px solid ${tone.border}`, color: tone.icon, flexShrink: 0 }}
        aria-hidden="true"
      >
        <em className="icon ni ni-globe" style={{ fontSize: 14 }} />
      </span>
      <span className="d-flex flex-wrap align-items-center" style={{ minWidth: 0, columnGap: 8, rowGap: 2 }}>
        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
          <span className="text-soft">{label}:</span>{" "}
          <strong className="text-dark">{pending ? "Loading…" : timeZoneLabelText(result)}</strong>
        </span>
        {localTime && (
          // aria-live off: the minute tick is not announced; the timezone change above still is.
          <span className="d-inline-flex align-items-center text-nowrap" style={{ gap: 4 }} aria-live="off">
            <span className="text-soft" aria-hidden="true">·</span>
            <em className="icon ni ni-clock" style={{ color: tone.icon, fontSize: 13 }} aria-hidden="true" />
            <span className="text-soft">Local time:</span>
            <strong className="text-dark" style={{ fontVariantNumeric: "tabular-nums" }}>{localTime}</strong>
          </span>
        )}
      </span>
    </div>
  );
};

// One compact line inside a calendar event box: "Tutor: 02-Nov-2026, 6:00–7:00 PM (Asia/Kolkata)".
// The full text is also the line's tooltip, as the box can be narrower than the text.
const ClassPersonTimeLine = ({ label, kind, personId, start, end }) => {
  const { userId, pending } = usePersonUserId(kind, personId);
  const result = useUserTimeZone(pending ? null : userId);
  const text = `${label}: ${pending ? "Loading…" : classTimeLabelText(result, start ?? null, end)}`;
  return (
    <div title={text} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: 0.95 }}>
      {text}
    </div>
  );
};

// The class time in each listed person's timezone; people: [{ label, kind, personId }].
export const ClassPeopleTimeLines = ({ people, start, end }) =>
  (people || []).map((person) => <ClassPersonTimeLine key={`${person.kind}-${person.personId}`} {...person} start={start} end={end} />);

// "Add class day(s)": the entered Start time, End time and From date are India time (the stored class times).
export const IndiaTimeEntryNote = ({ className = "" }) => (
  <small className={`d-block text-soft ${className}`.trim()}>
    <em className="icon ni ni-clock mr-1" aria-hidden="true" />
    Start time, End time and From date are India time ({CLASS_STORAGE_TIME_ZONE}) and are saved exactly as entered.
  </small>
);

// The text alone, for places that already have their own label.
export const UserTimeZoneText = ({ userId, start, end }) => {
  const result = useUserTimeZone(userId);
  return <>{start === undefined ? timeZoneLabelText(result) : classTimeLabelText(result, start, end)}</>;
};

export default UserTimeZoneLabel;
