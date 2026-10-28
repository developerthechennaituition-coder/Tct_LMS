import { axios } from "../library/axios";

const notificationRequests = new Map();
const notificationCache = new Map();
const NOTIFICATION_CACHE_MS = 1500;

export const fetchNotifications = (userId) => {
  if (!userId) return Promise.resolve([]);

  const cached = notificationCache.get(userId);
  if (cached && Date.now() - cached.fetchedAt < NOTIFICATION_CACHE_MS) {
    return Promise.resolve(cached.data);
  }

  const pendingRequest = notificationRequests.get(userId);
  if (pendingRequest) return pendingRequest;

  const request = axios
    .get(`/Notification/getnotificationbyuserId?userId=${userId}`)
    .then((data) => {
      notificationCache.set(userId, { data, fetchedAt: Date.now() });
      return data;
    })
    .finally(() => notificationRequests.delete(userId));

  notificationRequests.set(userId, request);
  return request;
};

export const fetchNotificationsById = (id) => {
  return axios.get(`/Notification/getnotificationbyid?id=${id}`);
};

export const GetSalesDetails = (salesId, salesDetailsId, scheduleDetailsId) => {
  const emptyGuid = "00000000-0000-0000-0000-000000000000";
  if (!salesDetailsId || salesDetailsId === emptyGuid) {
    return Promise.reject(new Error("A valid sales details ID is required."));
  }
  const userRole = localStorage.userRole;
  const schedId = scheduleDetailsId || emptyGuid;
  return axios.get(`/Sales/salesDetails?salesId=${salesId}&salesDetailsId=${salesDetailsId}&scheduleDetailsId=${schedId}&userRole=${userRole}`);
};

export const MarkAsRead = (notifiDetailsId, userId) => {
  return axios.post(`/Notification/ReadUnread?notifiDetailsId=${notifiDetailsId}`, {}).then((response) => {
    if (response?.succeeded !== false) {
      notificationCache.delete(userId);
      window.dispatchEvent(new CustomEvent("tct:notifications-changed"));
    }
    return response;
  });
};

export const MarkAllAsRead = (notifications, userId) => {
  const unreadIds = (notifications || []).filter((item) => item.isRead === false).map((item) => item.id);
  if (unreadIds.length === 0) return Promise.resolve([]);

  return Promise.all(unreadIds.map((id) => axios.post(`/Notification/ReadUnread?notifiDetailsId=${id}`, {})))
    .then((responses) => {
      notificationCache.delete(userId);
      window.dispatchEvent(new CustomEvent("tct:notifications-changed"));
      return responses;
    });
};
