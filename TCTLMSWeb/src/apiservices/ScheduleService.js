import { axios } from "../library/axios";

export const insertSchedule = (input) => {
  return axios.post(`/Scheduler/Saveschedule`,input);
};

export const getScheduleBySubjectId = (tutorId, subjectId, studentId) => {
  return axios.get(
    `/Scheduler/GetScheduleBySubjectId?tutorId=${tutorId}&subjectId=${subjectId}&studentId=${studentId}`,
  );
};

export const addOrUpdateSchedule = (input) => {
  return axios.post(`/Scheduler/AddOrUpdateSchedule`, input);
};

export const getTutorScheduledEvents = (guestId, guestType) => {
  return axios.get(`/Scheduler/getscheduledeventbyid?guestId=${guestId}&guestType=${guestType}`);
};

export const getTutorScheduleDetails = (guestId, guestType, month, year) => {
  return axios.get(
    `/Scheduler/getScheduleDetailsById?guestId=${guestId}&guestType=${guestType}&month=${month}&year=${year}`,
  );
};

// Operations "View Calendar": every tutor's and student's classes for the month.
export const getAllScheduleDetails = (month, year) => {
  return axios.get(`/Scheduler/getAllScheduleDetails?month=${month}&year=${year}`);
};

export const getLookupForClassStatus =(endDate, lookupCode, scheduleType) => {
  return axios.get(
    `/Scheduler/getLookupForClassStatus?lookupCode=${lookupCode}&endTime=${endDate}&scheduleType=${scheduleType}`,
  );
};

export const getStudentclasses = (studentId) => {
  return axios.get(`/Scheduler/getstudentclasses?studentId=${studentId}`);
};

export const updateScheduleStatus = (inputData) => {
  return axios.post(`/Scheduler/updateScheduleStatus`, inputData);
};

export const getFutureClassCompletionTestEnabled = async () => {
  const response = await axios.get(`/Scheduler/future-class-completion-test-enabled`);
  return response?.enabled === true;
};

export const UpdateScheduleDetail = (inputData) => {
  return axios.post(`/Scheduler/UpdateScheduleDetail`, inputData);
};

export const getScheduleByTutorId = (tutorId) => {
  return axios.get(`/Scheduler/GetScheduleByTutorId?tutorId=${tutorId}`);
};

export const checkCanCancelClass = (salesDetailId, year, month) => {
  return axios.get(`/tct/classcancellationpolicy/validate?salesDetailisId=${salesDetailId}`);
};

export const approveSchedules = (inputData, userId) => {
  const payload = {
    ScheduleIds: inputData,
    userId: userId,
    isApprovedMethod: true,
  };
  return axios.post(`/Scheduler/approveRecjectTutorAttendance`, payload);
};

export const rejectSchedules = (inputData, userId) => {
  const payload = {
    ScheduleIds: inputData,
    userId: userId,
    isApprovedMethod: false,
  };
  return axios.post(`/Scheduler/approveRecjectTutorAttendance`, payload);
};

export const gettutorpayroll = (month, year) => {
  return axios.get(`/Scheduler/gettutorpayroll?month=${month}&year=${year}`);
};

export const gettutorinvoicebyid = (invoiceNumber) => {
  return axios.get(`/Scheduler/gettutorinvoicebyid?invoiceNumber=${invoiceNumber}`);
};

export const generateTutorInvoice = (inputYear, inputMonth, tutorId, createdBy) => {
  return axios.post(`/Scheduler/generateTutorInvoice`, {
    inputYear,
    inputMonth,
    tutorId,
    createdBy,
  });
};

export const getstudentinvoicebyid = (invoiceNumber) => {
  return axios.get(`/Scheduler/getstudentinvoicebyid?invoiceNumber=${invoiceNumber}`);
};

export const getClassScheduleContext = (scheduleDetailsId) =>
  axios.get(`/Scheduler/scheduledetails?scheduleDetailsId=${encodeURIComponent(scheduleDetailsId)}`);

export const updatescheduledetails = (input) => {
  return axios.post(`/Scheduler/updatescheduledetails`, input);
};

export const deleteclass = (scheduleDetailsId, userId) => {
  return axios.get(`/Scheduler/deleteclass?scheduleDetailsId=${scheduleDetailsId}&userId=${userId}`);
};

export const gettutorpayrolllist = (tutorId) => {
  return axios.get(`/Scheduler/gettutorpayrolllist?tutorId=${tutorId}`);
};

export const getstudentinvoicelist = (studentId) => {
  return axios.get(`/Scheduler/getstudentinvoicelist?studentId=${studentId}`);
};

export const removeScheduler = (scheduleId, userId) => {
  return axios.get(`/Scheduler/removeScheduler?scheduleId=${scheduleId}&userId=${userId}`);
};

export const createStudetnInvoice = (input) => {
  return axios.post(`/Scheduler/createstudentinvoice`, input);
};

// Advance invoices: a subject's first month, created when its regular classes are first scheduled.
export const getAdvanceInvoices = (studentId) => axios.get(`/Scheduler/advance-invoices?studentId=${studentId}`);

export const sendAdvanceInvoice = (invoiceNumber) =>
  axios.post(`/Scheduler/advance-invoices/${encodeURIComponent(invoiceNumber)}/send`);

export const viewStudentInvoice = (invoiceNumber) => {
  return axios.get(`/Scheduler/studentinvoice?invoiceNumber=${invoiceNumber}`);
};

export const getStudentInvoice = (invoiceNumber) => {
  return axios.get(`/Scheduler/getstudentinvoicebyid?invoiceNumber=${invoiceNumber}`);
};

export const addRating = (inputData) => {
  return axios.post(`/Rating/addrating`, inputData);
};

export const getDemoPending = () => {
  return axios.get(`/Scheduler/getDemoPending`);
};

export const getNeedToSchedule = () => {
  return axios.get(`/Scheduler/getNeedToSchedule`);
};

export const getScheduleByStatus = (codes) => {
  return axios.get(`/Scheduler/getScheduleByStatus?codes=${codes}`);
};

export const getScheduledStudentList = (input) => {
  return axios.get(`/Scheduler/scheduled-student-list`, { params: input });
};

export const getScheduledTutorList = (input) => {
  return axios.get(`/Scheduler/scheduled-tutor-list`, { params: input });
};

export const getCompletedClassScheduleDetails = async (
  studentId = null,
  tutorId = null,
  operationId = null,
  fromDate = null,
  toDate = null,
  operationStatus = null
) => {
  const response = await axios.get(`/Scheduler/completed-class-details`, {
    params: {
      studentId,
      tutorId,
      operationId,
      fromDate,
      toDate,
      operationStatus
    },
  });

  return response?.data ?? [];
};

export const updateOperationScheduleStatus = async (payload) => {
  const response = await axios.put(`/Scheduler/update-operation-schedule-status`, payload);
  return response?.data;
};

export const bulkUpdateOperationScheduleStatus = async (payload) => {
  // The hosted API proxy rejects PUT requests before they reach the application.
  const response = await axios.post(`/Scheduler/bulk-update-operation-schedule-status`, payload);
  return response?.data;
};

export const updateScheduleApprovalStatus = (actionCode, studentId, scheduleIds, approverId) => {
  const payload = {
    actionCode: Number(actionCode),
    studentId,
    userId: approverId,
    scheduleIds: Array.isArray(scheduleIds) ? scheduleIds : [scheduleIds],
  };
  return axios.post(`/Scheduler/updateScheduleApprovalStatus`, payload);
};

export const getOperationstatuscount = (fromDate, toDate, operationId) => {
  return axios.get(
    `/Scheduler/tutor-status-count?fromDate=${fromDate}&toDate=${toDate}&operationId=${operationId}`,
  );
};

// ── Prepaid payment plans (Scenario 1) ──────────────────────────────────────
export const addOrUpdatePaymentPlan = (payload) => {
  return axios.post(`/Scheduler/payment-plan`, payload);
};

export const recordPayment = (payload) => {
  return axios.post(`/Scheduler/payment-plan/record-payment`, payload);
};

export const getPaymentPlanBySalesDetails = (salesDetailsId) => {
  return axios.get(`/Scheduler/payment-plan/by-sales-details/${salesDetailsId}`);
};

export const getPaymentPlansByStudent = (studentId) => {
  return axios.get(`/Scheduler/payment-plan/by-student/${studentId}`);
};

// Prepaid v2: raise the single upfront full-period invoice (all subjects as line items).
export const createPrepaidUpfrontInvoice = (studentId, createdBy) => {
  return axios.post(`/Scheduler/createprepaidupfrontinvoice`, {
    studentId,
    createdBy,
  });
};

// Prepaid v2: raise the informational monthly statement for a prepaid student.
export const createPrepaidStatement = (studentId, month, year, createdBy) => {
  return axios.post(`/Scheduler/createprepaidstatement`, {
    studentId,
    month,
    year,
    createdBy,
  });
};

// Prepaid v2: detect credit exhaustion, raise top-up + block + notify roles.
export const checkPrepaidOverrun = (studentId, createdBy) => {
  return axios.post(`/Scheduler/checkprepaidoverrun`, {
    studentId,
    createdBy,
  });
};

// Prepaid v2: SalesDetails ids whose plan is blocked (used to freeze calendar classes).
export const getBlockedPlans = () => {
    // The calendar handles failure explicitly; never assume unpaid packages are clear.
  return axios.get(`/Scheduler/blockedplans`, { skipErrorToast: true });
};

// Due Timings: each student's subject with the share of the month's classes completed.
export const getClassCompletion = (month, year) => {
  return axios.get(`/Scheduler/class-completion?month=${month}&year=${year}`);
};

// Schedule Calendar: tutors (Operations), a tutor's students (or the caller's own classes), events, and weekday changes.
export const getScheduleCalendarTutors = () => axios.get(`/schedule-calendar/tutors`);
export const getScheduleCalendarEnrolments = (tutorId) =>
  axios.get(`/schedule-calendar/enrolments${tutorId ? `?tutorId=${tutorId}` : ""}`);
export const getScheduleCalendarEvents = (salesDetailsId, from, to) =>
  axios.get(`/schedule-calendar/events?salesDetailsId=${salesDetailsId}&from=${from}&to=${to}`);
export const addWeeklyDayChange = (input) => axios.post(`/schedule-calendar/weekly-day-change`, input);
// Operations: independent tutor and student calendars, and "Modify" on a request (change, then approve).
export const getScheduleCalendarStudents = () => axios.get(`/schedule-calendar/students`);
export const getScheduleCalendarPersonEvents = ({ tutorId, studentId }, from, to) =>
  axios.get(`/schedule-calendar/person-events?${tutorId ? `tutorId=${tutorId}` : `studentId=${studentId}`}&from=${from}&to=${to}`);
export const modifyScheduleChangeRequest = (requestId, input) =>
  axios.post(`/schedule-calendar/requests/${requestId}/modify`, input);

// Class status edit requests: a tutor/student asks Operations to unlock a class status they already saved.
export const requestClassStatusEdit = (scheduleDetailsId, reason) => {
  return axios.post(`/class-status-edit-request`, { scheduleDetailsId, reason });
};

export const getClassStatusEditRequest = (scheduleDetailsId) => {
  return axios.get(`/class-status-edit-request/by-class/${scheduleDetailsId}`);
};

export const decideClassStatusEditRequest = (requestId, approve, comment) => {
  return axios.post(`/class-status-edit-request/${requestId}/decision`, { approve, comment });
};

// Schedule Calendar: tutors' and students' requests to add class day(s) for one enrolment, and Operations' decision.
export const getScheduleChangeRequests = (salesDetailsId) => {
  return axios.get(`/schedule-calendar/requests?salesDetailsId=${salesDetailsId}`);
};

export const decideScheduleChangeRequest = (requestId, approve, comment) => {
  return axios.post(`/schedule-calendar/requests/${requestId}/decision`, { approve, comment });
};

// Requests tab: every request (Operations) or the user's own (tutor/student).
export const getAllScheduleChangeRequests = (pendingOnly) => {
  return axios.get(`/schedule-calendar/requests/all?pendingOnly=${pendingOnly ? "true" : "false"}`);
};
