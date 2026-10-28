import { axios } from "../library/axios";

const token = localStorage.getItem("accessToken");

export const getUsers = (roleId, filterText, managerId, excludeStudentTutor = false, includeProfileImages = true) => {
  return axios.get(
    `/User/GetAllUser?roleId=${roleId}&filterText=${filterText}${managerId ? `&managerId=${managerId}` : ""}` +
      `&excludeStudentTutor=${excludeStudentTutor}&includeProfileImages=${includeProfileImages}`
  );
};

export const downloadUserExcel = (roleId, filterText, managerId) => {
  return axios.get(
    `/Reports/ExportToExcelUserList?roleId=${roleId}&filterText=${filterText}${managerId ? `&managerId=${managerId}` : ""}`
  );
};

export const getOwnership = (userType) => {
  return axios.get("/User/GetAllOwnership/?hideInActive=false");
};

export const getCorodinators = (userType) => {
  return axios.get("/User/GetAllCoordinator/?hideInActive=false");
};

export const deleteUser = (id) => {
  return axios.delete(`/user/deleteUser?id=${id}`);
};

export const setUserStatus = (id, isActive) => {
  return axios.post(`/user/setUserStatus?id=${id}&isActive=${isActive}`);
};

export const getTCTUserById = (id) => {
  return axios.get(`/user/gettctuserbyid?id=${id}`);
};

export const createUser = (formdata) => {
  return axios.post("/User/CreateTCTUser", formdata);
};

export const createSale = (formdata) => {
  alert(123);
  return axios.post("/Sales/createsales", formdata);
};

export const getRoles = () => {
  return axios.get("/Role/GetAll?hideInActive=false");
};

export const uploadProfileImage = (formdata) => {
  return axios.post("/UserProfile/uploadProfileImage", formdata);
};

export const getTutors = (userType) => {
  return axios.get("/User/GetTutor/");
};

export const getTutorsByAvailability = (studentId, salesId, subjectId) => {
  return axios.get(`/Tutor/GetTutorsByAvailability?studentId=${studentId}&salesId=${salesId}&subjectId=${subjectId}`);
};

export const getCoordinatorAdmins = () => {
  return axios.get("/User/getCoordinatorAdmins");
};

export const getOperationsAdmins = () => {
  return axios.get("/User/GetAllUser?roleId=3&filterText=");
};

export const getSuperAdmins = () => {
  return axios.get("/User/getSuperAdmins");
};

export const getUserRoles = () => {
  return axios.get("/Role/GetAll?hideInActive=true");
};

export const logoutUser = (userId) => {
  return axios.post("/user/updateUserActivity", { userId });
};

export const getUserActivity = (id) => {
  return axios.get(`/user/getUserActivitybyId?id=${id}`);
};

export const createUserAvailability = (formdata) => {
  return axios.post("/User/addOrUpdateUserAvailability", formdata);
};

export const addUserTimeSlots = (inputData) => {
  return axios.post("/User/addusertimeslots", inputData);
};

export const getUserAvailability = (id) => {
  return axios.get(`/user/getUserAvailabilityDataByUserIdAsync?id=${id}`);
};

export const getUserAvailabilityById = (id) => {
  return axios.get(`/user/getUserAvailabilityById?id=${id}`);
};

export const getOverlappingTimeSlot = (tutorId, stdId, date) => {
  const dateQuery = date ? `&date=${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "";
  return axios.get(`/user/GetOverlappingTimeSlot?tutorId=${tutorId}&stdId=${stdId}${dateQuery}`);
};

// from/to: "YYYY-MM-DD" calendar dates, inclusive.
export const getUserAvailableSlots = (userId, from, to) => {
  return axios.get(`/user/GetUserAvailableSlots?userId=${userId}&from=${from}&to=${to}`);
};

// Student vs tutor free time (Operations only). from/to: "YYYY-MM-DD" calendar dates, inclusive.
export const getAvailabilityComparison = (studentUserId, tutorUserId, from, to) => {
  return axios.get(
    `/user/GetAvailabilityComparison?studentUserId=${studentUserId}&tutorUserId=${tutorUserId}&from=${from}&to=${to}`,
  );
};

export const getTutorAvailablity = (tutorId) => {
  return axios.get(`/Scheduler/GetTutorAllocatedSchedule?tutorId=${tutorId}`);
};

export const getStudentAllocatedSchedule = (userId, studentId, salesDetailsId) => {
  return axios.get(
    `/Scheduler/GetStudentAllocatedSchedule?userId=${userId}&studentId=${studentId}&salesDetailsId=${salesDetailsId}`
  );
};

export const scheduleEvent = (inputData) => {
  return axios.post(`/Scheduler/ScheduleEvent`, inputData);
};

export const scheduleScheduleChangeRequest = (inputData) => {
  return axios.post(`/Scheduler/schedulechangerequest`, inputData);
};

export const getUserSlotsByDay = (userId, dayofWeek) => {
  return axios.get(`/user/getuserslotsbyday?userId=${userId}&dayofWeek=${dayofWeek}`);
};

export const updateTimeSlots = (inputData) => {
  return axios.post("/User/UpdateTimeSlots", inputData);
};

export const removeTimeSlot = (inputData) => {
  return axios.post("/User/RemoveTimeSlot", inputData);
};
