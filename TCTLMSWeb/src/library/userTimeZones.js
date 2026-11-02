// The saved timezone (User.TimeZoneId) of the student or tutor of a class, shown beside class dates and times.
// Display only: no class time is converted. Read with the existing GET /user/gettctuserbyid, once per user per
// page load; concurrent callers share the request. Needs a User.Id (never a Student.Id or Tutor.Id).
//   { status: "set", timeZoneId }  the profile loaded and has a timezone
//   { status: "notSet" }           the profile loaded and has no timezone
//   { status: "unavailable" }      no user id, no such user, or the request failed
import { useEffect, useState } from "react";
import { getTCTUserById } from "../apiservices/UserService";
import { getTutorById } from "../apiservices/TutorService";
import { getStudent } from "../apiservices/StudentEnrollmentService";

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
const UNAVAILABLE = { status: "unavailable", timeZoneId: null };

const requests = new Map(); // user id → Promise of a result
const results = new Map(); // user id → settled result

const keyOf = (userId) => {
  const value = userId == null ? "" : String(userId).trim().toLowerCase();
  return value && value !== EMPTY_GUID ? value : null;
};

export const loadUserTimeZone = (userId) => {
  const key = keyOf(userId);
  if (!key) return Promise.resolve(UNAVAILABLE);
  if (!requests.has(key)) {
    let failed = false;
    // Promise.resolve().then: a synchronous throw also ends as "unavailable".
    const request = Promise.resolve()
      .then(() => getTCTUserById(key))
      .then((response) => {
        const user = response?.data;
        if (!user) return UNAVAILABLE;
        return user.timeZoneId ? { status: "set", timeZoneId: user.timeZoneId } : { status: "notSet", timeZoneId: null };
      })
      .catch(() => {
        failed = true;
        return UNAVAILABLE;
      })
      .then((result) => {
        // A failed request is not kept, so a later screen tries again.
        if (failed) requests.delete(key);
        else results.set(key, result);
        return result;
      });
    requests.set(key, request);
  }
  return requests.get(key);
};

// React hook: the result for a user id, or null while it loads.
export const useUserTimeZone = (userId) => {
  const key = keyOf(userId);
  const [result, setResult] = useState(() => (key ? results.get(key) || null : UNAVAILABLE));
  useEffect(() => {
    let active = true;
    setResult(key ? results.get(key) || null : UNAVAILABLE);
    loadUserTimeZone(key).then((value) => {
      if (active) setResult(value);
    });
    return () => {
      active = false;
    };
  }, [key]);
  return result;
};

export const timeZoneLabelText = (result) =>
  !result
    ? "Loading…"
    : result.status === "set"
    ? result.timeZoneId
    : result.status === "notSet"
    ? "Timezone not set"
    : "Timezone unavailable";

// ---- A class's date / time in a person's timezone (display only; the class value itself is unchanged) ----
// The class instant comes from the value the screen already shows:
//   "…Z" / "…+05:30" (e.g. the class calendar's startDate) or a Date → that exact instant;
//   no offset (e.g. My Calendar's startTime) → a stored class time, which the server keeps as India
//   wall-clock time (TctTime.cs); this is the storage rule for class values, not anyone's timezone.
// It is then formatted with Intl in the person's saved IANA timezone, so daylight saving follows the class date.
export const CLASS_STORAGE_TIME_ZONE = "Asia/Kolkata";
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;
const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;
const formatters = new Map();

const formatterFor = (timeZone, numeric) => {
  const key = `${timeZone}|${numeric}`;
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.DateTimeFormat("en-US", numeric
      ? { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }
      : { timeZone, year: "numeric", month: "short", day: "2-digit", hour: "numeric", minute: "2-digit", hour12: true }));
  }
  return formatters.get(key);
};

const partsIn = (instantMs, timeZone, numeric) => {
  const parts = {};
  formatterFor(timeZone, numeric).formatToParts(new Date(instantMs)).forEach((part) => { parts[part.type] = part.value; });
  return parts;
};

// UTC offset (ms) of a timezone at an instant.
const offsetAt = (instantMs, timeZone) => {
  const p = partsIn(instantMs, timeZone, true);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(instantMs / 1000) * 1000;
};

// The class instant (epoch ms) of a class date / time value, or null when there is none.
export const classInstantMs = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (HAS_OFFSET.test(text)) {
    const instant = Date.parse(text);
    return Number.isNaN(instant) ? null : instant;
  }
  const match = WALL_CLOCK.exec(text);
  if (!match) return null;
  const naive = Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +(match[6] || 0));
  const first = naive - offsetAt(naive, CLASS_STORAGE_TIME_ZONE);
  return naive - offsetAt(first, CLASS_STORAGE_TIME_ZONE);
};

// "02-Nov-2026, 6:00–7:00 PM (Asia/Kolkata)"; "02-Nov-2026, 11:00 AM – 12:30 PM (…)" across noon;
// "02-Nov-2026, 11:30 PM – 03-Nov-2026, 12:30 AM (…)" when the end falls on another local day.
// null when the start or the timezone cannot be used.
export const classTimeInZoneText = (start, end, timeZone) => {
  const startMs = classInstantMs(start);
  if (startMs === null || !timeZone) return null;
  try {
    const dateOf = (p) => `${p.day}-${p.month}-${p.year}`;
    const clockOf = (p) => `${p.hour}:${p.minute}`;
    const s = partsIn(startMs, timeZone, false);
    let text = `${dateOf(s)}, ${clockOf(s)} ${s.dayPeriod}`;
    const endMs = classInstantMs(end);
    if (endMs !== null && endMs > startMs) {
      const e = partsIn(endMs, timeZone, false);
      text = dateOf(e) !== dateOf(s)
        ? `${text} – ${dateOf(e)}, ${clockOf(e)} ${e.dayPeriod}`
        : e.dayPeriod === s.dayPeriod
        ? `${dateOf(s)}, ${clockOf(s)}–${clockOf(e)} ${e.dayPeriod}`
        : `${text} – ${clockOf(e)} ${e.dayPeriod}`;
    }
    return `${text} (${timeZone})`;
  } catch (e) {
    return null;
  }
};

// Label text for a person's class time: their local class time, or the matching fallback.
export const classTimeLabelText = (result, start, end) => {
  if (!result) return "Loading…";
  if (result.status === "notSet") return "Timezone not set";
  if (result.status !== "set") return "Timezone unavailable";
  if (classInstantMs(start) === null) return `Class time unavailable (${result.timeZoneId})`;
  return classTimeInZoneText(start, end, result.timeZoneId) || "Timezone unavailable";
};

// ---- The User ids used by a class calendar event's labels (display only) ----
// event.tutorUserId / event.studentUserId are never changed: other calendar features read them. When the API
// leaves one empty, the labels use, in order:
//   student: the calendar owner on a student's calendar (the API loads only that student's classes);
//   tutor:   the calendar owner on a tutor's calendar, otherwise the tutor's User.Id from the existing
//            GET /Tutor/gettutorbyid for event.tutorId (it accepts a Tutor.Id or a User.Id), cached per tutor.
const tutorRequests = new Map(); // tutor id → Promise of a User.Id (or null)
const tutorUserIds = new Map(); // tutor id → settled User.Id (or null)

export const resolveTutorUserId = (tutorId) => {
  const key = keyOf(tutorId);
  if (!key) return Promise.resolve(null);
  if (!tutorRequests.has(key)) {
    let failed = false;
    const request = Promise.resolve()
      .then(() => getTutorById(key))
      .then((response) => keyOf(response?.data?.id))
      .catch(() => {
        failed = true;
        return null;
      })
      .then((userId) => {
        if (failed) tutorRequests.delete(key);
        else tutorUserIds.set(key, userId);
        return userId;
      });
    tutorRequests.set(key, request);
  }
  return tutorRequests.get(key);
};

const directTutorUserId = (event) =>
  event?.tutorUserId || (event?.calendarGuestType === "tutor" ? event?.calendarOwnerUserId : null) || null;

const studentUserIdOf = (event) =>
  event?.studentUserId || (event?.calendarGuestType === "student" ? event?.calendarOwnerUserId : null) || null;

// Promise of { tutorUserId, studentUserId } for a class (for places that cannot use the hook).
export const resolveClassUserIds = (event) => {
  const direct = directTutorUserId(event);
  return (direct ? Promise.resolve(direct) : resolveTutorUserId(event?.tutorId)).then((tutorUserId) => ({
    tutorUserId: tutorUserId || null,
    studentUserId: studentUserIdOf(event),
  }));
};

// React hook: { tutorUserId, studentUserId, tutorPending } for a class; tutorPending while the tutor is resolved.
export const useClassUserIds = (event) => {
  const direct = directTutorUserId(event);
  const tutorKey = direct ? null : keyOf(event?.tutorId);
  const [resolved, setResolved] = useState(() => (tutorKey && tutorUserIds.has(tutorKey) ? tutorUserIds.get(tutorKey) : undefined));
  useEffect(() => {
    let active = true;
    setResolved(tutorKey && tutorUserIds.has(tutorKey) ? tutorUserIds.get(tutorKey) : undefined);
    if (tutorKey) {
      resolveTutorUserId(tutorKey).then((userId) => {
        if (active) setResolved(userId);
      });
    }
    return () => {
      active = false;
    };
  }, [tutorKey]);
  return {
    tutorUserId: direct || resolved || null,
    studentUserId: studentUserIdOf(event),
    tutorPending: Boolean(tutorKey) && resolved === undefined,
  };
};

// ---- A Student.Id → that student's User.Id (display only), from the existing GET /Student/GetStudent ----
const studentRequests = new Map(); // Student.Id → Promise of a User.Id (or null)
const studentUserIds = new Map(); // Student.Id → settled User.Id (or null)

export const resolveStudentUserId = (studentId) => {
  const key = keyOf(studentId);
  if (!key) return Promise.resolve(null);
  if (!studentRequests.has(key)) {
    let failed = false;
    const request = Promise.resolve()
      .then(() => getStudent(key))
      .then((response) => keyOf(response?.data?.userId))
      .catch(() => {
        failed = true;
        return null;
      })
      .then((userId) => {
        if (failed) studentRequests.delete(key);
        else studentUserIds.set(key, userId);
        return userId;
      });
    studentRequests.set(key, request);
  }
  return studentRequests.get(key);
};

const personResolvers = {
  tutor: { resolve: (id) => resolveTutorUserId(id), cache: tutorUserIds }, // Tutor.Id or a tutor's User.Id
  student: { resolve: (id) => resolveStudentUserId(id), cache: studentUserIds }, // Student.Id
};

// React hook: { userId, pending } for a person id of the given kind ("tutor" | "student").
export const usePersonUserId = (kind, personId) => {
  const resolver = personResolvers[kind];
  const key = resolver ? keyOf(personId) : null;
  const [resolved, setResolved] = useState(() => (key && resolver.cache.has(key) ? resolver.cache.get(key) : undefined));
  useEffect(() => {
    let active = true;
    setResolved(key && resolver.cache.has(key) ? resolver.cache.get(key) : undefined);
    if (key) {
      resolver.resolve(key).then((userId) => {
        if (active) setResolved(userId);
      });
    }
    return () => {
      active = false;
    };
  }, [kind, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return { userId: resolved || null, pending: Boolean(key) && resolved === undefined };
};

// Tests only.
export const resetUserTimeZonesForTests = () => {
  requests.clear();
  results.clear();
  tutorRequests.clear();
  tutorUserIds.clear();
  studentRequests.clear();
  studentUserIds.clear();
};
