import { axios } from "../library/axios";

// IANA timezone IDs the server accepts: { available, timeZoneIds }.
export const getSupportedTimeZones = () => {
  return axios.get("/User/timezones", { skipErrorToast: true });
};

// Saves a user's timezone; null clears it. Resolves to { succeeded, userId, timeZoneId, message }.
export const updateUserTimeZone = (userId, timeZoneId) => {
  return axios.post(`/User/${userId}/timezone`, { timeZoneId: timeZoneId || null }, { skipErrorToast: true });
};
