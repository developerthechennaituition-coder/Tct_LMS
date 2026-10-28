import { axios } from "../library/axios";

// Tutor Change (student) / Student Change (tutor) requests and their review by Operations.
// The server takes the user from the login token, so no user, student or tutor id is sent as the
// requester. Errors are shown by the page itself (skipErrorToast).
const quiet = { skipErrorToast: true };

export const getMyChangeAssignments = () => axios.get(`/change-requests/my-assignments`, quiet);

export const submitChangeRequest = (request) => axios.post(`/change-requests`, request, quiet);

// list: "students" (Tutor Change requests) or "tutors" (Student Change requests)
export const getOperationsChangeRequests = (list) =>
  axios.get(`/change-requests/operations/${encodeURIComponent(list)}`, quiet);

export const getReplacementTutors = (list, requestId) =>
  axios.get(`/change-requests/operations/${encodeURIComponent(list)}/${encodeURIComponent(requestId)}/replacement-tutors`, quiet);

export const approveChangeRequest = (list, requestId, body) =>
  axios.post(`/change-requests/operations/${encodeURIComponent(list)}/${encodeURIComponent(requestId)}/approve`, body, quiet);

export const rejectChangeRequest = (list, requestId, body) =>
  axios.post(`/change-requests/operations/${encodeURIComponent(list)}/${encodeURIComponent(requestId)}/reject`, body, quiet);

// Server message for a failed request (the API returns { success: false, message }).
export const changeRequestErrorMessage = (error, fallback) =>
  (typeof error?.response?.data?.message === "string" && error.response.data.message) ||
  (!error?.response ? "Unable to reach the server. Please check your connection and try again." : fallback);
