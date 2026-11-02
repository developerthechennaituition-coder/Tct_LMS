import { isCurrentMenuLink } from "./menuActiveLink";

const siblings = ["/", "/lms/my-calendar", "/lms/my-calendar?tab=tasks", "/lms/students"];
const current = (link, pathname, search = "", base = "") => isCurrentMenuLink(link, siblings, pathname, search, base);

describe("sidebar current link", () => {
  test("Tasks is current on the Tasks tab, My Calendar is not", () => {
    expect(current("/lms/my-calendar?tab=tasks", "/lms/my-calendar", "?tab=tasks")).toBe(true);
    expect(current("/lms/my-calendar", "/lms/my-calendar", "?tab=tasks")).toBe(false);
  });

  test("Tasks stays current with extra query values (notification links)", () => {
    expect(current("/lms/my-calendar?tab=tasks", "/lms/my-calendar", "?tab=tasks&list=verification")).toBe(true);
    expect(current("/lms/my-calendar", "/lms/my-calendar", "?tab=tasks&list=mine")).toBe(false);
  });

  test("My Calendar is current on the calendar tab, Tasks is not", () => {
    expect(current("/lms/my-calendar", "/lms/my-calendar", "")).toBe(true);
    expect(current("/lms/my-calendar?tab=tasks", "/lms/my-calendar", "")).toBe(false);
    expect(current("/lms/my-calendar", "/lms/my-calendar", "?tab=calendar")).toBe(true);
  });

  test("links without a query keep the exact path match", () => {
    expect(current("/lms/students", "/lms/students", "?page=2")).toBe(true);
    expect(current("/lms/students", "/lms/students/edit", "")).toBe(false);
    expect(current("/", "/", "")).toBe(true);
    expect(isCurrentMenuLink("/lms/students", undefined, "/lms/students", "")).toBe(true);
  });

  test("PUBLIC_URL prefix and empty links", () => {
    expect(current("/lms/my-calendar?tab=tasks", "/app/lms/my-calendar", "?tab=tasks", "/app")).toBe(true);
    expect(current(undefined, "/lms/students", "")).toBe(false);
    expect(current("", "", "")).toBe(false);
    expect(current("/lms/students", null, "")).toBe(false);
  });
});
