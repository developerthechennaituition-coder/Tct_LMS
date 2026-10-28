import { axios } from "../library/axios";

const token = localStorage.getItem('accessToken');

export const getLookups = (code) => {
  return axios.get(`/MasterDetail/GetByTypeGroupId/${code}`)
};


export const getAllMaster = () => {
  return axios.get(`/Master/GetAll?hideInActive=false`);
};

export const addUpdateTypecode = (input) => {
  return axios.post(`/MasterDetail/addupdatetypecode`, input)
};

export const deleteTypecode = (id) => {
  return axios.get(`/MasterDetail/deletetypecode?id=${id}`);
};

export const getAllRoles = () => {
  return axios.get(`/Role/GetAll`);
};

export const getGradeByGroupAsync = (inputData) => {
  return axios.post(`/MasterDetail/GetGradeByGroupAsync`, inputData);
};

export const getGroupByBoardAsync = (boardIds) => {
  return axios.get(`/MasterDetail/GetGradeGroupByBoardAsync?boardIds=${boardIds}`);
};
