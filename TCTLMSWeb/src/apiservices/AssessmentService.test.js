import { axios } from "../library/axios";
import { getStudentTestPapers, getTestSchedulesForUpload, getAnswerSheetSubmissions, validateAssessmentFiles, downloadAssessmentFile } from "./AssessmentService";

jest.mock("../library/axios", () => ({ axios: { get: jest.fn(), defaults: { baseURL: "/api" } } }));

beforeEach(() => jest.clearAllMocks());

test("student identity comes from the session, not a supplied student ID", () => {
  getStudentTestPapers("another-student");
  expect(axios.get).toHaveBeenCalledWith("/Assessment/student-tests");
});

test("upload list does not send spoofable role or user IDs", () => {
  getTestSchedulesForUpload("other-user", 1, "A & B");
  expect(axios.get).toHaveBeenCalledWith("/Assessment/test-schedules", { params: { filterText: "A & B" } });
});

test("evaluation list omits empty filter instead of submitting an empty required string", () => {
  getAnswerSheetSubmissions("other-tutor", "");
  expect(axios.get).toHaveBeenCalledWith("/Assessment/answer-sheet-submissions", { params: { filterText: undefined } });
});

test.each([
  [[]],
  [[{ name: "answer.exe", size: 100 }]],
  [[{ name: "answer.pdf", size: 0 }]],
  [[{ name: "answer.pdf", size: 21 * 1024 * 1024 }]],
  [Array.from({ length: 11 }, () => ({ name: "page.png", size: 100 }))],
  [Array.from({ length: 3 }, () => ({ name: "page.png", size: 20 * 1024 * 1024 }))],
])("invalid upload selection is rejected", (files) => expect(validateAssessmentFiles(files)).toBeTruthy());

test("multiple valid pages are accepted", () => {
  expect(validateAssessmentFiles([{ name: "Page1.PDF", size: 100 }, { name: "Page2.png", size: 200 }])).toBeNull();
});

test("download uses authenticated axios and preserves ZIP extension", async () => {
  jest.useFakeTimers();
  axios.get.mockResolvedValue(new Blob(["zip"], { type: "application/zip" }));
  URL.createObjectURL = jest.fn(() => "blob:test");
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
    expect(this.download).toBe("answer-sheet-submission.zip");
  });
  await downloadAssessmentFile("submission", true);
  expect(axios.get).toHaveBeenCalledWith("/Assessment/answer-sheet/submission/download", { responseType: "blob", skipErrorToast: true });
  expect(click).toHaveBeenCalled();
  jest.runAllTimers();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  click.mockRestore();
  jest.useRealTimers();
});

test("denied download returns server message", async () => {
  axios.get.mockRejectedValue({ response: { data: { message: "Test window closed" } } });
  await expect(downloadAssessmentFile("test")).rejects.toThrow("Test window closed");
});
