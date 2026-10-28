import { axios } from "../library/axios";
export const createTutor = (formdata) => {
  return axios.post("/Tutor/CreateTutor", formdata);
};
export const getTutorSkillset = (tutorId) => {
  return axios.get(`/Tutor/gettutorskillset?tutorId=${tutorId}`);
};

export const GetTutorDashboardInfo = (tutorId) => {
  return axios.get(`Scheduler/GetTutorDashboardInfo?tutorId=${tutorId}`);
};

export const getTutorSubjects = (tutorId) => {
  return axios.get(`/Tutor/gettutorsubjects?tutorId=${tutorId}`);
};

export const UpdateTutorPayment = (inputData) => {
  return axios.put("/tutor/UpdateTutorPayment", inputData);
};
export const getTutorPaymentApproval = (id) => {
  return axios.get(`/tutor/payment-approval/${id}`);
};
export const decideTutorPaymentApproval = (inputData) => {
  return axios.post("/tutor/payment-approval/decision", inputData);
};
export const addUpdateTutorSkillset = (formdata) => {
  return axios.post("/tutor/AddUpdateTutorSkillset", formdata);
};

export const getAllTutor = () => {
  return axios.get("/Tutor/getalltutor");
};

export const getTutorById = (id) => {
  return axios.get(`/Tutor/gettutorbyid?id=${id}`);
};

export const getPaymentPercentage = (params) => {
  return axios.get(`/PaymentPercentageConfig/getPaymentPercentage`, {
    params: {
      boardId: params.boardId,
      gradeId: params.gradeId,
      subjectId: params.subjectId,
      tutorPayment: params.tutorPayment,
    },
  });
};

export const getAllTutorsSubmittedAttendance = () => {
  return axios.get("/Tutor/GetAllAttendanceSubmittedTutors");
};

export const generateTutorInvoice = (formdata) => {
  return axios.post("/Scheduler/generateTutorInvoice", formdata);
};

export const getAllTutorDetails = async () => {
  return await axios.get("/Tutor/getalltutordetails");
};

export const getFilteredTutors = (board, grade, gradeGroups, subject, search, pageSize, pageNumber, signal) => {
  return axios.get("/Tutor/getalltutordetailswithfilter", {
    signal,
    params: {
      boardIds: board, // assuming board is an array
      gradeIds: grade, // assuming grade is an array
      gradeGroupIds: gradeGroups, // assuming gradeGroups is an array
      subjectIds: subject, // assuming subject is an array
      search: search || "",
      pageSize: pageSize,
      pageNumber: pageNumber,
    },
  });
};

export const getFilterOptions = () => {
  return axios.get("/Tutor/getalltutordetails");
};

export const deleteTutorSkillset = async (id) => {
    const response = await axios.post(`/Tutor/deletetutorskillset?id=${id}`, {});
    return response.data;
};
