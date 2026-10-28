import { axios } from "../library/axios";

const token = localStorage.getItem("accessToken");

export const getThresholdConfig = () => {
    return axios.get("/Threshold/GetAll?hideInActive=false");
  };

export const getThresholdConfigById = (id) => {
  return axios.get(`/Threshold/${id}`);
};

export const addThresholdConfig = (input) => {
return axios.post(`/Threshold`, input);
};

export const updateThresholdConfigById = (id, input) => {
return axios.put(`/Threshold/${id}`, input);
};

export const deleteThresholdConfig = (id) => {
return axios.delete(`/Threshold/${id}`);
}