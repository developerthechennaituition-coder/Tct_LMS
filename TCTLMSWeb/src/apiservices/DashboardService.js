import { axios } from "../library/axios";
import { toDateOnly } from "../library/dashboardDates";

export const getSalesByBoard = (typeGroupCode) => {
  return axios.get(`/AdminDashboard/salesbyboard?typeGroupCode=${typeGroupCode}`);
};

export const GetUserCountByRole = () => {
  return axios.get(`/AdminDashboard/GetUserCountByRole`);
};

export const getStudentDashboardSummary = (userId) => {
    return axios.get(`/Scheduler/studentDashboardSummary?userId=${userId}`);
};

export const getAccountsDashboardSummary = (userId) => {        
    return axios.get(`Dashboard/accountsDashboardSummary?userId=${userId}`);
};

export const getStudentAccountStatus = () => {
    return axios.get(`/Dashboard/studentAccountStatus`);
};

export const getStudentScheduleSummaryById = (studentId, month = null, year = null) => {
    let url = `/Dashboard/getStudentScheduleSummaryById?studentId=${studentId}`;
    
    if (month) {
        url += `&month=${encodeURIComponent(month)}`;
    }
    if (year) {
        url += `&year=${year}`;
    }
    
    return axios.get(url);
};

export const getTutorAccountStatus = () => {
    return axios.get(`/Dashboard/tutorAccountStatus`);
};

export const getTutorScheduleSummaryById = (tutorId, month = null, year = null) => {
    let url = `/Dashboard/getTutorScheduleSummaryById?tutorId=${tutorId}`;
    
    if (month) {
        url += `&month=${encodeURIComponent(month)}`;
    }
    if (year) {
        url += `&year=${year}`;
    }
    
    return axios.get(url);
};

export const submitTctLearningExperienceFeedback = (feedback) => {
  return axios.post(`/Dashboard/submitTctLearningExperienceFeedback`, feedback);
};

export const submitTutorDailyFeedback = (feedback) => {
  return axios.post(`/Dashboard/submitTutorDailyFeedback`, feedback);
};

export const hasStudentFeedbackToday = (userId) => {
  return axios.get(`/Dashboard/hasStudentFeedbackToday?userId=${userId}`);
};

export const hasTutorFeedbackToday = (userId) => {
  return axios.get(`/Dashboard/hasTutorFeedbackToday?userId=${userId}`);
};

export const hasTutorMappedStudents = (userId) => {
  return axios.get(`/Dashboard/hasTutorMappedStudents?userId=${userId}`);
};

export const hasTutorCompletedFirstClass = (userId) => {
  return axios.get(`/Dashboard/hasTutorCompletedFirstClass?userId=${userId}`);
};

export const hasStudentCompletedFirstClass = (userId) => {
  return axios.get(`/Dashboard/hasStudentCompletedFirstClass?userId=${userId}`);
};

const studentDashboardUrl = (studentId, path) =>
  `/student-dashboard/${studentId}/${path}`;

export const getCurrentStudentContext = (userId) =>
  axios.get(`/student-dashboard/current-student?userId=${encodeURIComponent(userId)}`);

export const getStudentDashboardProfile = (studentId) =>
  axios.get(studentDashboardUrl(studentId, "profile"));

export const getStudentDashboardCourses = (studentId) =>
  axios.get(studentDashboardUrl(studentId, "courses"));

export const getStudentDashboardUpcomingClasses = (studentId, take = 100) =>
  axios.get(studentDashboardUrl(studentId, `upcoming-classes?take=${take}`));

export const getStudentDashboardAttendance = (studentId, fromDate, toDate) => {
  const params = new URLSearchParams();
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  const query = params.toString();
  return axios.get(studentDashboardUrl(studentId, `attendance${query ? `?${query}` : ""}`));
};

export const getStudentDashboardMonthlyAttendance = (studentId) =>
  axios.get(studentDashboardUrl(studentId, "attendance/monthly"));

export const getStudentDashboardTutors = (studentId) =>
  axios.get(studentDashboardUrl(studentId, "tutors"));

export const getStudentDashboardRatings = (studentId) =>
  axios.get(studentDashboardUrl(studentId, "ratings"));

export const getStudentDashboardNotifications = (studentId, take = 100) =>
  axios.get(studentDashboardUrl(studentId, `notifications?take=${take}`));

export const getStudentDashboardUnreadNotificationCount = (studentId) =>
  axios.get(studentDashboardUrl(studentId, "notifications/unread-count"));

export const getStudentDashboardMessageSummary = (studentId) =>
  axios.get(studentDashboardUrl(studentId, "messages/summary"));

export const getStudentDashboardConversations = (studentId) =>
  axios.get(studentDashboardUrl(studentId, "messages/conversations"));

export const getStudentDashboardFeedback = (studentId) =>
  axios.get(studentDashboardUrl(studentId, "feedback"));

export const getStudentDashboardCurrentSummary = (studentId) =>
  axios.get(studentDashboardUrl(studentId, "summary"));

const unwrapDashboardData = (response, fallback) => response?.data ?? fallback;

export const getCurrentStudentDashboard = async () => {
  const userId = localStorage.getItem("userId");
  if (!userId) throw new Error("User ID not found. Please log in again.");
  const contextResponse = await getCurrentStudentContext(userId);
  const studentId = contextResponse?.data?.studentId;
  if (!studentId) throw new Error("No student profile is linked to the logged-in user.");
  localStorage.setItem("studentId", studentId);

  const [
    profile,
    courses,
    upcomingClasses,
    attendance,
    monthlyAttendance,
    tutors,
    ratings,
    notifications,
    unreadNotificationCount,
    messageSummary,
    conversations,
    feedback,
    summary,
  ] = await Promise.all([
    getStudentDashboardProfile(studentId),
    getStudentDashboardCourses(studentId),
    getStudentDashboardUpcomingClasses(studentId),
    getStudentDashboardAttendance(studentId),
    getStudentDashboardMonthlyAttendance(studentId),
    getStudentDashboardTutors(studentId),
    getStudentDashboardRatings(studentId),
    getStudentDashboardNotifications(studentId),
    getStudentDashboardUnreadNotificationCount(studentId),
    getStudentDashboardMessageSummary(studentId),
    getStudentDashboardConversations(studentId),
    getStudentDashboardFeedback(studentId),
    getStudentDashboardCurrentSummary(studentId),
  ]);

  return {
    studentId,
    profile: unwrapDashboardData(profile, null),
    courses: unwrapDashboardData(courses, []),
    upcomingClasses: unwrapDashboardData(upcomingClasses, []),
    attendance: unwrapDashboardData(attendance, []),
    monthlyAttendance: unwrapDashboardData(monthlyAttendance, []),
    tutors: unwrapDashboardData(tutors, []),
    ratings: unwrapDashboardData(ratings, []),
    notifications: unwrapDashboardData(notifications, []),
    unreadNotificationCount: unwrapDashboardData(unreadNotificationCount, {}),
    messageSummary: unwrapDashboardData(messageSummary, {}),
    conversations: unwrapDashboardData(conversations, []),
    feedback: unwrapDashboardData(feedback, []),
    summary: unwrapDashboardData(summary, {}),
  };
};

const tutorDashboardUrl = (tutorId, path) =>
  `/tutor-dashboard/${tutorId}/${path}`;

export const getCurrentTutorContext = (userId) =>
  axios.get(`/tutor-dashboard/current-tutor?userId=${encodeURIComponent(userId)}`);

export const getTutorDashboardProfile = (tutorId) =>
  axios.get(tutorDashboardUrl(tutorId, "profile"));

export const getTutorDashboardDemoVideos = (tutorId) =>
  axios.get(tutorDashboardUrl(tutorId, "demo-videos"));

export const getTutorDashboardSubjects = (tutorId) =>
  axios.get(tutorDashboardUrl(tutorId, "subjects"));

export const getTutorDashboardSchedule = (tutorId, fromDate, toDate) => {
  const params = new URLSearchParams();
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  return axios.get(tutorDashboardUrl(tutorId, `schedule?${params.toString()}`));
};

export const getTutorDashboardDemoHistory = (tutorId) =>
  axios.get(tutorDashboardUrl(tutorId, "history/demos"));

export const getTutorDashboardAllocationHistory = (tutorId) =>
  axios.get(tutorDashboardUrl(tutorId, "history/allocations"));

export const getTutorDashboardStudents = (tutorId) =>
  axios.get(tutorDashboardUrl(tutorId, "students"));

export const getTutorDashboardAvailability = (tutorId) =>
  axios.get(tutorDashboardUrl(tutorId, "availability"));

export const getTutorDashboardRatings = (tutorId) =>
  axios.get(tutorDashboardUrl(tutorId, "ratings"));

export const getTutorDashboardMonthlyHours = (tutorId, fromDate, toDate) => {
  const params = new URLSearchParams();
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  return axios.get(tutorDashboardUrl(tutorId, `hours/monthly?${params.toString()}`));
};

export const getTutorDashboardCancellationHistory = (tutorId) =>
  axios.get(tutorDashboardUrl(tutorId, "cancellations/monthly"));

export const getTutorDashboardHomework = (tutorId, take = 100) =>
  axios.get(tutorDashboardUrl(tutorId, `homework?take=${take}`));

export const getTutorDashboardCurrentSummary = (tutorId) =>
  axios.get(tutorDashboardUrl(tutorId, "summary"));

export const getCurrentTutorDashboard = async (fromDate, toDate) => {
  const userId = localStorage.getItem("userId");
  if (!userId) throw new Error("User ID not found. Please log in again.");

  const contextResponse = await getCurrentTutorContext(userId);
  const tutorId = contextResponse?.data?.tutorId;
  if (!tutorId) throw new Error("No tutor profile is linked to the logged-in user.");
  localStorage.setItem("tutorId", tutorId);

  const responses = await Promise.all([
    getTutorDashboardProfile(tutorId),
    getTutorDashboardDemoVideos(tutorId),
    getTutorDashboardSubjects(tutorId),
    getTutorDashboardSchedule(tutorId, fromDate, toDate),
    getTutorDashboardDemoHistory(tutorId),
    getTutorDashboardAllocationHistory(tutorId),
    getTutorDashboardStudents(tutorId),
    getTutorDashboardAvailability(tutorId),
    getTutorDashboardRatings(tutorId),
    getTutorDashboardMonthlyHours(tutorId, fromDate, toDate),
    getTutorDashboardCancellationHistory(tutorId),
    getTutorDashboardHomework(tutorId),
    getTutorDashboardCurrentSummary(tutorId),
  ]);

  const [profile, demoVideos, subjects, schedule, demoHistory, allocationHistory,
    students, availability, ratings, monthlyHours, cancellationHistory, homework, summary] = responses;

  return {
    tutorId,
    profile: unwrapDashboardData(profile, null),
    demoVideos: unwrapDashboardData(demoVideos, []),
    subjects: unwrapDashboardData(subjects, []),
    schedule: unwrapDashboardData(schedule, []),
    demoHistory: unwrapDashboardData(demoHistory, []),
    allocationHistory: unwrapDashboardData(allocationHistory, []),
    students: unwrapDashboardData(students, []),
    availability: unwrapDashboardData(availability, []),
    ratings: unwrapDashboardData(ratings, []),
    monthlyHours: unwrapDashboardData(monthlyHours, []),
    cancellationHistory: unwrapDashboardData(cancellationHistory, []),
    homework: unwrapDashboardData(homework, []),
    summary: unwrapDashboardData(summary, {}),
  };
};

const operationsDashboardUrl = (path, parameters = {}) => {
  const params = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const query = params.toString();
  return `/operations-dashboard/${path}${query ? `?${query}` : ""}`;
};

export const getOperationsDashboardSummary = (date) =>
  axios.get(operationsDashboardUrl("summary", { date }));
export const getOperationsPlannedClasses = (date, take = 100) =>
  axios.get(operationsDashboardUrl("classes/planned", { date, take }));
export const getOperationsRescheduledClasses = (date, take = 100) =>
  axios.get(operationsDashboardUrl("classes/rescheduled", { date, take }));
export const getOperationsActiveStudents = (take = 100) =>
  axios.get(operationsDashboardUrl("students/active", { take }));
export const getOperationsActiveTutors = (take = 100) =>
  axios.get(operationsDashboardUrl("tutors/active", { take }));
export const getOperationsLowEngagementTutors = (take = 100) =>
  axios.get(operationsDashboardUrl("alerts/low-engagement", { take }));
export const getOperationsCancellations = (fromDate, toDate, take = 100) =>
  axios.get(operationsDashboardUrl("alerts/cancellations", { fromDate, toDate, take }));
export const getOperationsMissedAttendance = (date, take = 100) =>
  axios.get(operationsDashboardUrl("alerts/missed-attendance", { date, take }));
export const getOperationsDailySummary = (date) =>
  axios.get(operationsDashboardUrl("classes/daily-summary", { date }));
export const getOperationsTimeWiseClasses = (date, take = 100) =>
  axios.get(operationsDashboardUrl("classes/time-wise", { date, take }));
export const getOperationsEnrollmentByCourse = () =>
  axios.get(operationsDashboardUrl("enrollments/by-course"));
export const getOperationsEnrollmentTrend = (fromDate, toDate) =>
  axios.get(operationsDashboardUrl("enrollments/trend", { fromDate, toDate }));
export const getOperationsDailyCompletion = (date) =>
  axios.get(operationsDashboardUrl("classes/completion", { date }));
export const getOperationsStudentMismatch = (fromDate, toDate, take = 200) =>
  axios.get(operationsDashboardUrl("mismatch/student", { fromDate, toDate, take }));
export const getOperationsOperationMismatch = (fromDate, toDate, take = 200) =>
  axios.get(operationsDashboardUrl("mismatch/operation", { fromDate, toDate, take }));
export const getOperationsTutorMismatch = (fromDate, toDate, take = 200) =>
  axios.get(operationsDashboardUrl("mismatch/tutor", { fromDate, toDate, take }));
export const getOperationsExtraClasses = (fromDate, toDate, take = 500) =>
  axios.get(operationsDashboardUrl("classes/extra", { fromDate, toDate, take }));

export const getCurrentOperationsDashboard = async (date, fromDate, toDate) => {
  const previousDate = new Date(`${date}T00:00:00`);
  previousDate.setDate(previousDate.getDate() - 1);
  const dMinusOne = toDateOnly(previousDate);

  const responses = await Promise.all([
    getOperationsDashboardSummary(date),
    getOperationsPlannedClasses(date),
    getOperationsRescheduledClasses(date),
    getOperationsActiveStudents(),
    getOperationsActiveTutors(),
    getOperationsLowEngagementTutors(),
    getOperationsCancellations(fromDate, toDate),
    getOperationsMissedAttendance(dMinusOne),
    getOperationsDailySummary(dMinusOne),
    getOperationsTimeWiseClasses(date),
    getOperationsEnrollmentByCourse(),
    getOperationsEnrollmentTrend(fromDate, toDate),
    getOperationsDailyCompletion(dMinusOne),
    getOperationsStudentMismatch(fromDate, toDate),
    getOperationsOperationMismatch(fromDate, toDate),
    getOperationsTutorMismatch(fromDate, toDate),
    getOperationsExtraClasses(fromDate, toDate),
  ]);

  const data = (response, fallback) => response?.data ?? fallback;
  return {
    summary: data(responses[0], {}),
    plannedClasses: data(responses[1], []),
    rescheduledClasses: data(responses[2], []),
    activeStudents: data(responses[3], []),
    activeTutors: data(responses[4], []),
    lowEngagementTutors: data(responses[5], []),
    cancellations: data(responses[6], []),
    missedAttendance: data(responses[7], []),
    dailySummary: data(responses[8], {}),
    timeWiseClasses: data(responses[9], []),
    enrollmentByCourse: data(responses[10], []),
    enrollmentTrend: data(responses[11], []),
    dailyCompletion: data(responses[12], {}),
    studentMismatch: data(responses[13], []),
    operationMismatch: data(responses[14], []),
    tutorMismatch: data(responses[15], []),
    extraClasses: data(responses[16], []),
    dMinusOne,
  };
};

const coordinatorDashboardUrl = (coordinatorId, path, parameters = {}) => {
  const params = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const query = params.toString();
  return `/coordinator-dashboard/${coordinatorId}/${path}${query ? `?${query}` : ""}`;
};

export const getCurrentCoordinatorDashboard = async (fromDate, toDate) => {
  const coordinatorId = localStorage.getItem("userId");
  if (!coordinatorId) throw new Error("User ID not found. Please log in again.");
  const paths = [["summary",{fromDate,toDate}],["courses"],["students"],["demos/pipeline",{fromDate,toDate}],
    ["demos/conversions",{fromDate,toDate}],["tutors/workload"],["classes/progress",{fromDate,toDate}],["alerts",{fromDate,toDate}]];
  const responses = await Promise.all(paths.map(([path,params]) => axios.get(coordinatorDashboardUrl(coordinatorId,path,params))));
  const data=(response,fallback)=>response?.data??fallback;
  return {summary:data(responses[0],{}),courses:data(responses[1],[]),students:data(responses[2],[]),pipeline:data(responses[3],[]),conversions:data(responses[4],[]),workload:data(responses[5],[]),progress:data(responses[6],[]),alerts:data(responses[7],[])};
};

// Inflow records behind the Coordinator Dashboard summary cards (same coordinator and date filters as summary).
export const getCurrentCoordinatorInflowDetails = async (fromDate, toDate, signal) => {
  const coordinatorId = localStorage.getItem("userId");
  if (!coordinatorId) throw new Error("User ID not found. Please log in again.");
  const response = await axios.get(coordinatorDashboardUrl(coordinatorId, "demos/inflow", { fromDate, toDate, take: 500 }), { signal });
  return response?.data ?? [];
};


const superAdminDashboardUrl = (path, parameters = {}) => {
  const params = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const query = params.toString();
  return `/super-admin-dashboard/${path}${query ? `?${query}` : ""}`;
};

export const getCurrentSuperAdminDashboard = async (fromDate, toDate) => {
  const paths = [
    ["summary", { fromDate, toDate }], ["boards"], ["students/active"], ["tutors/active"],
    ["courses/completion", { fromDate, toDate }], ["attendance", { fromDate, toDate }],
    ["resources/utilization", { fromDate, toDate }], ["users/latest", { fromDate, toDate }],
  ];
  const responses = await Promise.all(paths.map(([path, params]) => axios.get(superAdminDashboardUrl(path, params))));
  const data = (response, fallback) => response?.data ?? fallback;
  return {
    summary: data(responses[0], {}), boards: data(responses[1], []), students: data(responses[2], []),
    tutors: data(responses[3], []), completion: data(responses[4], []), attendance: data(responses[5], []),
    utilization: data(responses[6], []), latestUsers: data(responses[7], []),
  };
};



const coordinatorAdminDashboardUrl = (path, parameters = {}) => {
  const params = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => value !== undefined && value !== null && value !== "" && params.set(key, value));
  const query = params.toString();
  return `/coordinator-admin-dashboard/${path}${query ? `?${query}` : ""}`;
};
export const getCurrentCoordinatorAdminDashboard = async (fromDate, toDate) => {
  const calls = [["summary",{fromDate,toDate}],["coordinators",{fromDate,toDate}],["approvals/pending"],["demos/pipeline",{fromDate,toDate}]];
  const responses = await Promise.all(calls.map(([path,params]) => axios.get(coordinatorAdminDashboardUrl(path,params))));
  const data=(r,f)=>r?.data??f;
  return {summary:data(responses[0],{}),coordinators:data(responses[1],[]),approvals:data(responses[2],[]),pipeline:data(responses[3],[])};
};

const getRoleDashboard = async (role, names, fromDate, toDate) => {
  const responses = await Promise.all(names.map((name) =>
    axios.get(`/role-dashboard/${role}/${name}?fromDate=${fromDate}&toDate=${toDate}`)
  ));
  return Object.fromEntries(names.map((name, index) => [
    name === "payment-modes" ? "paymentModes" : name,
    responses[index]?.data ?? (name === "summary" ? {} : []),
  ]));
};

export const getFinanceDashboard = (fromDate, toDate) =>
  getRoleDashboard("finance", ["summary", "trend", "outstanding", "payment-modes"], fromDate, toDate);

export const getHrDashboard = (fromDate, toDate) =>
  getRoleDashboard("hr", ["summary", "pipeline", "trend", "engagement"], fromDate, toDate);
