import moment from "moment";
import {
  formatTaskDeadline,
  isDeadlineBeforeNow,
  latestReview,
  latestSubmission,
  validateProofFiles,
  verificationLabel,
} from "./myCalendarTasks";

// ── Deadline display: older tasks have no due time and stay date-only ─────────
test.each([
  [{ dueDate: "2026-11-05T00:00:00" }, "05-Nov-2026"],
  [{ dueDate: "2026-11-05T00:00:00", dueTime: null }, "05-Nov-2026"],
  [{ dueDate: "2026-11-05T00:00:00", dueTime: "17:30:00" }, "05-Nov-2026, 05:30 PM"],
  [{ dueDate: "2026-11-05", dueTime: "09:05" }, "05-Nov-2026, 09:05 AM"],
  [{ dueDate: "2026-11-05T00:00:00", dueTime: "garbage" }, "05-Nov-2026"],
  [{}, "—"],
])("deadline %j → %s", (task, expected) => {
  expect(formatTaskDeadline(task)).toBe(expected);
});

// ── Deadline must not be earlier than now ─────────────────────────────────────
const now = moment("2026-11-02T14:30:00");
test.each([
  ["2026-11-02", "14:29", true],
  ["2026-11-02", "14:30", false],
  ["2026-11-02", "18:00", false],
  ["2026-11-01", "23:59", true],
  ["2026-11-02", "", false], // no time: only the existing date rule applies
  ["", "10:00", false],
])("%s %s before now → %s", (date, time, expected) => {
  expect(isDeadlineBeforeNow(date, time, now)).toBe(expected);
});

test("verification labels", () => {
  expect(verificationLabel("PendingVerification")).toBe("Pending Verification");
  expect(verificationLabel("ChangesRequested")).toBe("Changes Requested");
  expect(verificationLabel("InProgress")).toBe("In Progress");
  expect(verificationLabel(undefined)).toBe("");
});

// ── Latest submission / review from the newest-first history ─────────────────
const task = {
  verificationHistory: [
    { id: "4", action: "Resubmitted", comments: "fixed" },
    { id: "3", action: "ChangesRequested", comments: "add proof" },
    { id: "2", action: "Submitted", comments: "done" },
    { id: "1", action: "Started" },
  ],
};
test("latest submission and review", () => {
  expect(latestSubmission(task).id).toBe("4");
  expect(latestReview(task).id).toBe("3");
  expect(latestSubmission({})).toBeNull();
  expect(latestReview({ verificationHistory: [{ action: "Started" }] })).toBeNull();
});

// ── Proof files: same limits as the server ───────────────────────────────────
const file = (name, size) => ({ name, size });
const MB = 1024 * 1024;
test.each([
  [[], ""],
  [[file("proof.pdf", 100), file("shot.PNG", 100)], ""],
  [[file("a.exe", 100)], "invalid"],
  [[file("a.pdf", 0)], "invalid"],
  [[file("a.pdf", 11 * MB)], "invalid"],
  [[file("a.pdf", 9 * MB), file("b.pdf", 9 * MB), file("c.pdf", 9 * MB)], "invalid"],
  [Array.from({ length: 6 }, (_, i) => file(`${i}.png`, 10)), "Attach up to 5 files."],
])("files %#", (files, expected) => {
  const message = validateProofFiles(files);
  if (expected === "invalid") expect(message).toMatch(/up to 10 MB each/);
  else expect(message).toBe(expected);
});
