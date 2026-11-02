import { axios } from "../library/axios";

// My Calendar (demo classes) and its Tasks tab. The server takes the user from the login token,
// so no user id is sent. Errors are shown by the page itself (skipErrorToast).
const quiet = { skipErrorToast: true };

export const getMyCalendarDemos = (month, year) =>
  axios.get(`/my-calendar/demos?month=${month}&year=${year}`, quiet);

export const getMyCalendarClasses = (month, year) =>
  axios.get(`/my-calendar/classes?month=${month}&year=${year}`, quiet);

export const getTaskAssignees = () => axios.get(`/my-calendar/task-assignees`, quiet);

export const getMyTasks = () => axios.get(`/my-calendar/tasks`, quiet);

export const createUserTask = (task) => axios.post(`/my-calendar/tasks`, task, quiet);

export const completeUserTask = (taskId) =>
  axios.put(`/my-calendar/tasks/${encodeURIComponent(taskId)}/complete`, null, quiet);

// Task verification workflow. Who may submit / verify is decided by the server (canSubmitForVerification /
// canVerify on each task only drive the buttons).
export const startUserTask = (taskId) =>
  axios.put(`/my-calendar/tasks/${encodeURIComponent(taskId)}/start`, null, quiet);

export const getPendingVerificationTasks = () => axios.get(`/my-calendar/tasks/pending-verification`, quiet);

export const submitTaskForVerification = (taskId, notes, files) => {
  const data = new FormData();
  if (notes) data.append("notes", notes);
  (files || []).forEach((file) => data.append("files", file, file.name));
  return axios.post(`/my-calendar/tasks/${encodeURIComponent(taskId)}/submit-verification`, data, quiet);
};

export const verifyUserTask = (taskId, comment) =>
  axios.put(`/my-calendar/tasks/${encodeURIComponent(taskId)}/verify`, { comment: comment || null }, quiet);

export const requestUserTaskChanges = (taskId, comment) =>
  axios.put(`/my-calendar/tasks/${encodeURIComponent(taskId)}/request-changes`, { comment }, quiet);

// Proof file download through the authenticated client (same approach as the assessment downloads).
export const downloadTaskAttachment = async (attachment) => {
  try {
    const blob = await axios.get(`/my-calendar/tasks/attachments/${encodeURIComponent(attachment.id)}`, { responseType: "blob", ...quiet });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.fileName || "attachment";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    let message = "Unable to download this file. Please try again.";
    try {
      const data = error.response?.data;
      const detail = data instanceof Blob ? JSON.parse(await data.text()) : data;
      if (detail?.message) message = detail.message;
    } catch (_) { /* Keep the safe default for non-JSON server errors. */ }
    throw new Error(message);
  }
};

// Server message for a failed request (the API returns { success: false, message }).
export const myCalendarErrorMessage = (error, fallback) =>
  (typeof error?.response?.data?.message === "string" && error.response.data.message) ||
  (!error?.response ? "Unable to reach the server. Please check your connection and try again." : fallback);

// Demo status workflow (only the enrolment's own Coordinator can read/update the status; checked by the server).
export const getDemoStatusOptions = () => axios.get(`/my-calendar/demo-statuses`, quiet);

export const getMyCalendarFollowUps = (month, year) =>
  axios.get(`/my-calendar/follow-ups?month=${month}&year=${year}`, quiet);

export const getDemoStatus = (salesDetailsId) =>
  axios.get(`/my-calendar/demo-status/${encodeURIComponent(salesDetailsId)}`, quiet);

export const updateDemoStatus = (update) => axios.put(`/my-calendar/demo-status`, update, quiet);
