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
