import { axios } from "../library/axios";

const token = localStorage.getItem("accessToken");

export const getTCTBankDetails = () => {
    return axios.get("/TCTBankDetails/GetAll?hideInActive=false");
  };

export const getActiveTCTBankDetails = () => {
  return axios.get("/TCTBankDetails/GetAll?hideInActive=true");
};
  
export const getTCTBankDetailById = (id) => {
    return axios.get(`/TCTBankDetails/${id}`);
};

export const addTCTBankDetail = (input) => {
  return axios.post(`/TCTBankDetails`, input);
};

export const updateTCTBankDetail = (id, input) => {
  return axios.post(`/TCTBankDetails/update/${id}`, input);
};

export const deleteTCTBankDetail = (id) => {
  return axios.delete(`/TCTBankDetails/${id}`);
};

export const getIndianTutorBankDetailsByTutorId = (id) => {
  return axios.get(`/IndianTutorBankDetails/GetByTutorId/${id}`);
};

export const getIndianTutorBankDetailsByBankId = (id) => {
  return axios.get(`/IndianTutorBankDetails/${id}`);
};

export const addIndianTutorBankDetails = (input) => {
return axios.post(`/IndianTutorBankDetails`, input);
};

export const updateIndianTutorBankDetails = (id, input) => {
return axios.put(`/IndianTutorBankDetails/${id}`, input);
};

export const deleteIndianTutorBankDetails = (id) => {
return axios.delete(`/IndianTutorBankDetails/${id}`);
};

export const getForeignTutorBankDetailsByTutorId = (id) => {
  return axios.get(`/ForeignTutorPaymentDetails/GetPaymentDetailsByTutorId/${id}`);
};

export const getForeignTutorBankDetailsByBankId = (id) => {
  return axios.get(`/ForeignTutorPaymentDetails/${id}`);
};

export const addForeignTutorBankDetails = (input) => {
return axios.post(`/ForeignTutorPaymentDetails`, input);
};

export const updateForeignTutorBankDetails = (id, input) => {
return axios.put(`/ForeignTutorPaymentDetails/${id}`, input);
};

export const deleteForeignTutorBankDetails = (id) => {
return axios.delete(`/ForeignTutorPaymentDetails/${id}`);
};

export const updateTCTBankDetailToStudent = (input) => {
  return axios.post(`/TCTBankDetails/bankdetailsforpayment`, input);
};
