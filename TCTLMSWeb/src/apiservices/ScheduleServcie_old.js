import { axios } from "../library/axios";

export const insertSchedule = (input) => {
    return axios.post(`/Scheduler/Saveschedule`, input);
};
    

export const addOrUpdateSchedule = (input) => {
    return axios.post(`/Scheduler/AddOrUpdateSchedule`, input);
};

export const getTutorScheduledEvents = (tutorId, guestType) => {
    return axios.get(`/Scheduler/getscheduledeventbyid?tutorId=${tutorId}&guestType=${guestType}`);
}

export const updateScheduleStatus = (inputData) => {
    return axios.post(`/Scheduler/updateScheduleStatus`, inputData);
}

export const getScheduleByTutorId = (tutorId) => {
    return axios.get(`/Scheduler/GetScheduleByTutorId?tutorId=${tutorId}`);
}