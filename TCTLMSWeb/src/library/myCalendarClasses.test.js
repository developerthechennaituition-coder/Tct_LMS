import { showsClassEvents, toClassEvent, visibleClassEvents } from "./myCalendarClasses";

describe("showsClassEvents", () => {
  it("is true only for Operations and Operations Admin", () => {
    expect(showsClassEvents("Operations")).toBe(true);
    expect(showsClassEvents(" operationsadmin ")).toBe(true);
    ["Coordinator", "CoordinatorAdmin", "SuperAdmin", "Admin", "Sales", "Tutor", "Student", "", null, undefined]
      .forEach((role) => expect(showsClassEvents(role)).toBe(false));
  });
});

const row = (overrides = {}) => ({
  scheduleDetailsId: "sd-1",
  scheduleId: "s-1",
  studentName: "Student",
  subjectName: "Subject",
  tutorName: "Tutor on the schedule row",
  startTime: "2026-10-26T18:00:00",
  endTime: "2026-10-26T19:30:00",
  scheduleType: "Class",
  ...overrides,
});

describe("toClassEvent", () => {
  it("keeps the tutor, dates and identity from the schedule row", () => {
    const event = toClassEvent(row());
    expect(event.tutorName).toBe("Tutor on the schedule row");
    expect(event.start).toBe("2026-10-26T18:00:00");
    expect(event.end).toBe("2026-10-26T19:30:00");
    expect(event.title).toBe("Student · Subject");
    expect(event.id).toBe("my-class-sd-1");
  });

  it("is a read-only class event, distinct from demo events", () => {
    const event = toClassEvent(row());
    expect(event.isClass).toBe(true);
    expect(event.canUpdateStatus).toBe(false);
    expect(event.className).toBe("mc-class-event");
    expect(event.id.startsWith("my-demo-")).toBe(false);
  });

  it("falls back to the schedule title when names are missing", () => {
    expect(toClassEvent(row({ studentName: null, subjectName: null, title: "Schedule Class" })).title).toBe("Schedule Class");
  });
});

describe("visibleClassEvents", () => {
  const classes = [toClassEvent(row()), toClassEvent(row({ scheduleDetailsId: "sd-2" }))];

  it("shows every class once with no filter", () => {
    const duplicated = [...classes, toClassEvent(row())];
    expect(visibleClassEvents(duplicated, { allStatuses: true, dDayActive: false }).map((c) => c.scheduleDetailsId))
      .toEqual(["sd-1", "sd-2"]);
  });

  it("hides classes while a demo status filter or D-day filter is active", () => {
    expect(visibleClassEvents(classes, { allStatuses: false, dDayActive: false })).toEqual([]);
    expect(visibleClassEvents(classes, { allStatuses: true, dDayActive: true })).toEqual([]);
  });

  it("handles a missing list", () => {
    expect(visibleClassEvents(undefined, { allStatuses: true, dDayActive: false })).toEqual([]);
  });
});
