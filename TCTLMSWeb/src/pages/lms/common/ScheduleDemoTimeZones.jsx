import React from "react";
import { CLASS_STORAGE_TIME_ZONE, classTimeInZoneText, useUserTimeZone } from "../../../library/userTimeZones";
import { convertToTimeSpan } from "../../../utils/Utils";

// Schedule Demo modal: each participant's saved timezone (User.TimeZoneId) and the selected demo time in it.
// Display only: nothing here changes the date, the slots or what Save sends. User ids only (never Student.Id /
// Tutor.Id); a missing id, a missing profile or an empty timezone all show "Time zone not set".

const NOT_SET = "Time zone not set";

const PEOPLE = [
  { key: "student", label: "Student", icon: "user", tone: "info" },
  { key: "tutor", label: "Tutor", icon: "user-alt", tone: "primary" },
  { key: "coordinator", label: "Coordinator", icon: "user-check", tone: "success" },
];

const zoneOf = (result) => (result?.status === "set" ? result.timeZoneId : null);
const zoneText = (result) => (!result ? "Loading…" : zoneOf(result) || NOT_SET);

const useParticipantZones = ({ studentUserId, tutorUserId, coordinatorUserId }) => ({
  student: useUserTimeZone(studentUserId),
  tutor: useUserTimeZone(tutorUserId),
  coordinator: useUserTimeZone(coordinatorUserId),
});

// The demo is saved as the chosen date plus the slot's clock time in India time (the server stores class times
// as Asia/Kolkata wall clock), so the date is the chosen day as the server reads it: its date in Asia/Kolkata.
const storageDateOf = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: CLASS_STORAGE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};

const wallClockOf = (day, timeText) => {
  try {
    return day && timeText ? `${day}T${convertToTimeSpan(timeText).slice(0, 5)}` : null;
  } catch (e) {
    return null;
  }
};

// [{ start, end }] for every selected slot of the chosen date, as stored (Asia/Kolkata wall clock).
const selectedSlotsOf = (date, slotGroups) => {
  const day = storageDateOf(date);
  return (slotGroups || [])
    .flatMap((group) => group?.slots || [])
    .map((slot) => ({ start: wallClockOf(day, slot?.startTime), end: wallClockOf(day, slot?.endTime) }))
    .filter((slot) => slot.start);
};

const Avatar = ({ icon, tone }) => (
  <span className={`user-avatar xs bg-${tone}-dim`} style={{ flexShrink: 0 }} aria-hidden="true">
    <em className={`icon ni ni-${icon}`} />
  </span>
);

// "Time zones": Student / Tutor / Coordinator chips in one row, wrapping on narrow screens
// (styles: .tct-sd-* in ScheduleDemo.css).
export const ParticipantTimeZones = (props) => {
  const zones = useParticipantZones(props);
  return (
    <div className="tct-sd-zones">
      <span className="tct-sd-zones-title">
        <em className="icon ni ni-globe" aria-hidden="true" /> Time zones
      </span>
      {PEOPLE.map(({ key, label, icon, tone }) => (
        <div key={key} className="tct-sd-chip">
          <Avatar icon={icon} tone={tone} />
          <span className="tct-sd-chip-text">
            <span className="text-soft">{label} — </span>
            <strong className={zoneOf(zones[key]) ? "text-dark" : "text-warning"}>{zoneText(zones[key])}</strong>
          </span>
        </div>
      ))}
    </div>
  );
};

// Under the date: which timezone the date and the time slots below are in.
export const DemoTimeZoneNote = () => (
  <small className="tct-sd-hint">
    <em className="icon ni ni-clock text-primary mr-1" aria-hidden="true" />
    Date and time slots are in India Standard Time ({CLASS_STORAGE_TIME_ZONE}).
  </small>
);

// Under the time slots: the selected time in each participant's own timezone. One line only when every
// participant's saved timezone is the slots' timezone; otherwise one line per person (or "Time zone not set").
export const DemoLocalTimes = ({ date, slotGroups, ...people }) => {
  const zones = useParticipantZones(people);
  const slots = selectedSlotsOf(date, slotGroups);
  if (slots.length === 0) return null;
  const timesIn = (timeZone) =>
    slots.map((slot) => classTimeInZoneText(slot.start, slot.end, timeZone)).filter(Boolean).join("; ") || NOT_SET;
  const allInStorageZone = PEOPLE.every(({ key }) => zoneOf(zones[key]) === CLASS_STORAGE_TIME_ZONE);
  return (
    <div className="tct-sd-local" aria-live="polite">
      <h6 className="tct-sd-panel-title">
        <em className="icon ni ni-clock" aria-hidden="true" /> Selected time for each participant
      </h6>
      {allInStorageZone ? (
        <small className="d-block text-dark">All participants: {timesIn(CLASS_STORAGE_TIME_ZONE)}</small>
      ) : (
        <dl className="tct-sd-local-list">
          {PEOPLE.map(({ key, label, tone }) => {
            const timeZone = zoneOf(zones[key]);
            return (
              <div key={key} className={`tct-sd-local-row tct-sd-tone-${tone}`}>
                <dt>{label}</dt>
                <dd className={timeZone ? "text-dark" : "text-warning"}>{!zones[key] ? "Loading…" : timeZone ? timesIn(timeZone) : NOT_SET}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
};
