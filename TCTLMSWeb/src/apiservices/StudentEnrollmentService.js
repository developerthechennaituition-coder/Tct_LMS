import { axios } from "../library/axios";

export const getLookups = () => {
  return axios.get(`/MasterDetail/GetAllActiveMaster`);
};

export const getAllStudents = () => {
  return axios.get("/Student/GetAllStudent");
};

export const GetBoardViseStudentList = (boardId, gradeId, subjectId, filterText) => {
  return axios.get(
    `/Student/studentlistbyboard?boardId=${boardId}&gradeId=${gradeId}&subjectId=${subjectId}&filterText=${filterText}`
  );
};

export const GetStudents = (boardId, gradeId, subjectId, filterText, pageSize, pageNumber) => {
  return axios.get(
    `/Student/getstudents?boardId=${boardId}&gradeId=${gradeId}&subjectId=${subjectId}&filterText=${encodeURIComponent(filterText || "")}&pageSize=${pageSize}&pageNumber=${pageNumber}`
  );
};

export const GetStudentsbyTutor = (tutorId, boardId, gradeId, subjectId, filterText, pageSize, pageNumber) => {
  return axios.get(
    `/Student/getStudentsbyTutor?tutorId=${tutorId}&boardId=${boardId}&gradeId=${gradeId}&subjectId=${subjectId}&filterText=${encodeURIComponent(filterText || "")}&pageSize=${pageSize}&pageNumber=${pageNumber}`
  );
};

export const GetStudentsByUser = (userId, roleId, boardId, gradeId, subjectId, filterText, pageSize, pageNumber) => {
  return axios.get(
    `/Student/getStudentsByUser?userId=${userId}&roleId=${roleId}&boardId=${boardId}&gradeId=${gradeId}&subjectId=${subjectId}&filterText=${encodeURIComponent(filterText || "")}&pageSize=${pageSize}&pageNumber=${pageNumber}`
  );
};

export const GetBoardViseStudentListByUser = (userId, roleId, boardId, gradeId, subjectId, filterText) => {
  return axios.get(
    `/Student/studentlistbyuser?userId=${userId}&roleId=${roleId}&boardId=${boardId}&gradeId=${gradeId}&subjectId=${subjectId}&filterText=${filterText}`
  );
};

export const getSubjectList = (studentId, coordinatorId) => {
  return axios.get(`/Sales/GetSubjectList?studentId=${studentId}&coordinatorId=${coordinatorId}`);
};

export const getCoursesByCoordinatorId = (studentId, coordinatorId) => {
  return axios.get(`/Sales/GetCoursesByCoordinatorId?studentId=${studentId}&coordinatorId=${coordinatorId}`);
};

export const getCoordinatorAllStudent = (coordinatorId) => {
  return axios.get(`/Student/GetCoordinatorAllStudent?id=${coordinatorId}`);
};

export const getEnrolledCouse = (studentId) => {
  return axios.get(`/sales/getenrolledcourse?studentId=${studentId}`);
};

// Same enrolled courses, looked up by the student's user id.
export const getEnrolledCoursesByUser = (userId) => {
  return axios.get(`/sales/getenrolledcourse?userId=${userId}`);
};

export const getEnrollmentDetails = (salesId) => {
  return axios.get(`/sales/${salesId}`);
};

export const enrollnewcourse = (input) => {
  return axios.post(`/sales/enrollnewcourse`, input);
};

export const deletecourse = (deletailId) => {
  return axios.get(`/sales/deletecourse?detailsId=${deletailId}`);
};

export const getStudent = (studentId) => {
  return axios.get(`/Student/GetStudent?studentId=${studentId}`);
};

export const updateStudent = (input) => {
  return axios.post(`/student/updatestudent`, input);
};

export const addUpdateAddress = (inputData) => {
  return axios.post(`/StudentAddress/addupdateaddress`, inputData);
};

export const updateStatus = (input) => {
  return axios.post(`/sales/UpdateSalesDetailsStatus`, input);
};

export const updateStudnentDropout = (input) => {
  return axios.post(`/sales/UpdateStudentDropout`, input);
};

export const updateTutorAssignedStatus = (input) => {
  return axios.post(`/sales/UpdateTutorAssignedStatus`, input);
};

export const DownloadExcel = (boardId, gradeId, subjectId, boardName) => {
  return axios.get(
    `/Reports/boardvisesubjectreport?boardId=${boardId}&gradeId=${gradeId}&subjectId=${subjectId}&boardName=${boardName}`,
    {
      responseType: "blob",
    }
  );
};

export const createStudentRegistration = (input) => {
  return axios.post(`/student/studentRegistration`, input); // input must be FormData
};

export const updateStudentInfo = (input) => {
  return axios.post(`/sales/updatestudentinfo`, input);
};

export const getStudentSchedulesForInvoice = (studentId, month, year) => {
    console.log("Calling API with:", studentId, month, year); // ← add this log
    return axios.get(
        `/Scheduler/studentschedulesummary?studentId=${studentId}&month=${month}&year=${year}`
    );
};
