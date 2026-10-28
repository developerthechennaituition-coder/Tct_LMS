import { axios } from "../library/axios";

// ----------------------------------------------------------------------------------
// Test / Assessment document workflow (per product spec):
// 1) Tutor/Operations upload the Question Paper (QP) for a scheduled test — must be
//    shared at least 1 day before the exam date.
// 2) Student can view/download the QP only during the scheduled test date & time window.
// 3) Student submits (uploads) the completed Answer Sheet.
// 4) Tutor is notified and must evaluate the Answer Sheet within 1 day of submission.
// ----------------------------------------------------------------------------------

// Tutor / Operations: scheduled tests awaiting or having a question paper uploaded
export const getTestSchedulesForUpload = (userId, roleId, filterText) => {
  return axios.get(`/Assessment/test-schedules`, { params: { filterText: filterText || undefined } });
};

export const getAssessmentScheduleOptions = () => axios.get("/Assessment/schedule-options");
export const createAssessment = (payload) => axios.post("/Assessment/test-schedules", payload);
export const cancelAssessment = (id) => axios.post(`/Assessment/test-schedules/${id}/cancel`);

export const uploadQuestionPaper = (formData) => {
  // formData: TestScheduleId, UploadedByUserId, Notes, Files
  return axios.post(`/Assessment/upload-question-paper`, formData);
};

// Student: tests assigned to the logged-in student, with QP availability window info
export const getStudentTestPapers = () => {
  return axios.get(`/Assessment/student-tests`);
};

export const getQuestionPaperDownloadUrl = (testScheduleId) => {
  return `${axios.defaults.baseURL}/Assessment/question-paper/${testScheduleId}/download`;
};

export const submitAnswerSheet = (formData) => {
  // formData: TestScheduleId, StudentId, Files
  return axios.post(`/Assessment/submit-answer-sheet`, formData);
};

// Tutor: answer sheets submitted by students, pending / completed evaluation
export const getAnswerSheetSubmissions = (tutorId, filterText) => {
  return axios.get(`/Assessment/answer-sheet-submissions`, { params: { filterText: filterText || undefined } });
};

export const getAnswerSheetDownloadUrl = (submissionId) => {
  return `${axios.defaults.baseURL}/Assessment/answer-sheet/${submissionId}/download`;
};

export const evaluateAnswerSheet = (submissionId, payload) => {
  // payload: MarksObtained, MaxMarks, Feedback, EvaluatedByUserId
  return axios.post(`/Assessment/evaluate-answer-sheet/${submissionId}`, payload);
};

// Use the authenticated client (including token refresh), not a new unauthenticated tab.
export const downloadAssessmentFile = async (id, answerSheet = false) => {
  const category = answerSheet ? "answer-sheet" : "question-paper";
  try {
    const blob = await axios.get(`/Assessment/${category}/${id}/download`, { responseType: "blob", skipErrorToast: true });
    const extensions = { "application/zip": "zip", "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png",
      "application/msword": "doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx" };
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${category}-${id}.${extensions[blob.type] || "bin"}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    let message = "Unable to download this file. Please refresh and try again.";
    try {
      const data = error.response?.data;
      const detail = data instanceof Blob ? JSON.parse(await data.text()) : data;
      if (detail?.message) message = detail.message;
    } catch (_) { /* Keep the safe default for non-JSON server errors. */ }
    throw new Error(message);
  }
};

export const validateAssessmentFiles = (files) => {
  const extensions = /\.(pdf|doc|docx|jpg|jpeg|png)$/i;
  if (!files.length || files.length > 10) return "Select between 1 and 10 files.";
  if (files.some((file) => !extensions.test(file.name) || file.size <= 0 || file.size > 20 * 1024 * 1024)
      || files.reduce((sum, file) => sum + file.size, 0) > 40 * 1024 * 1024)
    return "Use PDF, DOC, DOCX, JPG or PNG files, up to 20 MB each and 40 MB total. Empty files are not allowed.";
  return null;
};
