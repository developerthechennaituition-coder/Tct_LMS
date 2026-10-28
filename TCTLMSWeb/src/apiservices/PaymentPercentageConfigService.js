import { axios } from "../library/axios";

const token = localStorage.getItem("accessToken");

export const getPaymentPercentageConfig = () => {
    return axios.get("/PaymentPercentageConfigurationView/GetAll?hideInActive=false");
  };

export const getPaymentPercentageConfigById = (id) => {
  return axios.get(`/PaymentPercentageConfig/${id}`);
};

export const addPaymentPercentageConfig = (input) => {
return axios.post(`/PaymentPercentageConfig`, input);
};

export const updatePaymentPercentageConfigById = (id, input) => {
return axios.put(`/PaymentPercentageConfig/${id}`, input);
};

export const deletePaymentPercentageConfig = (id) => {
return axios.delete(`/PaymentPercentageConfig/${id}`);
}