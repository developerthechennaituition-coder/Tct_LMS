import Axios from "axios";
import { config } from "./config";
import { toast } from "react-toastify";
import { Icon } from "../components/Component";
import { stopChatConnection } from "./signalRRegistry";

function authRequestInterceptor(cfg) {
  cfg.headers = Axios.AxiosHeaders.from(cfg.headers || {});
  const token = localStorage.getItem("accessToken");
  if (token) {
    // Replace any stale header retained on a retried Axios request.
    cfg.headers.delete("Authorization");
    cfg.headers.set("Authorization", `Bearer ${token}`);
  }
  cfg.headers.set("Accept", "application/json");
  return cfg;
}

const CloseButton = () => (
  <span className="btn-trigger toast-close-button" role="button">
    <Icon name="cross" />
  </span>
);

const showToastMessage = (message) => {
  toast.error(message, {
    position: "top-right",
    autoClose: true,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: false,
    closeButton: <CloseButton />,
  });
};

const getSafeErrorMessage = (error) => {
  const data = error.response?.data;
  const contentType = error.response?.headers?.["content-type"] || "";

  // ASP.NET's development exception page can contain stack traces and request
  // headers (including the bearer token). Never surface that response in the UI.
  if (typeof data === "string") {
    const looksLikeTechnicalResponse =
      contentType.includes("text/plain") ||
      contentType.includes("text/html") ||
      /SqlException|System\.|Microsoft\.|Authorization:\s*Bearer|\bat\s+\S+\([^)]*\)/i.test(data);

    return looksLikeTechnicalResponse
      ? "The server could not complete this request. Please try again or contact support."
      : data;
  }

  if (data && typeof data.message === "string") return data.message;
  return error.message || "Something went wrong. Please try again.";
};

function handleResponseError(error) {
  const originalRequest = error.config;
  const isAuthRequest = originalRequest?.url?.includes("/Auth/refresh-token")
    || originalRequest?.url?.includes("/Auth/authenticate-user")
    || originalRequest?.url?.includes("/Auth/complete-student-login");

  if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRequest) {
    originalRequest._retry = true;
    return refreshSession()
      .catch((refreshError) => {
        // This catch handles only the refresh call. A failure from the retried
        // business request must never be mistaken for an expired session.
        const refreshStatus = refreshError.response?.status;
        if (refreshStatus === 401 || refreshStatus === 403) {
          clearSessionAndRedirect();
        } else {
          const message =
            refreshError.response?.data?.message ||
            "Your session could not be refreshed right now. Please try again.";
          showToastMessage(message);
        }
        return Promise.reject(refreshError);
      })
      .then((result) => {
        originalRequest.headers = Axios.AxiosHeaders.from(originalRequest.headers || {});
        originalRequest.headers.delete("Authorization");
        originalRequest.headers.set("Authorization", `Bearer ${result.token}`);
        return axios.request(originalRequest);
      });
  }

  let message;
  if (!error.response) {
    // No response was received at all: server unreachable, device offline, CORS failure, etc.
    message =
      error.code === "ECONNABORTED"
        ? "The request timed out. Please check your internet connection and try again."
        : "Unable to reach the server. Please check your internet connection and try again.";
  } else {
    message = getSafeErrorMessage(error);
  }

  if (!originalRequest?.skipErrorToast) {
    showToastMessage(message);
  }
  return Promise.reject(error);
}

export const axios = Axios.create({
  baseURL: config.API_URL,
  withCredentials: true,
});

let refreshPromise = null;

export const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = Axios.post(`${config.API_URL}/Auth/refresh-token`, {}, { withCredentials: true })
      .then((response) => {
        const result = response.data;
        if (!result?.token) throw new Error("Session refresh failed.");
        localStorage.setItem("accessToken", result.token);
        if (result.refreshTokenExpiresAt) {
          localStorage.setItem("refreshTokenExpiresAt", result.refreshTokenExpiresAt);
          window.dispatchEvent(new Event("session-refreshed"));
        }
        return result;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

export const clearSessionAndRedirect = async () => {
  // Stop the chat hub connection (if one is live) before navigating away so
  // the server's disconnect handler — and the "offline" broadcast to other
  // users — fires immediately, instead of waiting on the browser to
  // eventually tear down the socket during the page unload.
  await stopChatConnection();
  ["accessToken", "refreshTokenExpiresAt", "userId", "userName", "email", "userRole", "roleId", "nationality", "MenuPermissions"]
    .forEach((key) => localStorage.removeItem(key));
  if (!window.location.pathname.includes("auth-login")) {
    window.location.href = `${process.env.PUBLIC_URL}/auth-login`;
  }
};

export const logoutSession = async () => {
  try {
    await Axios.post(`${config.API_URL}/Auth/revoke-token`, {}, { withCredentials: true });
  } finally {
    await clearSessionAndRedirect();
  }
};

axios.interceptors.request.use(
  (cfg) => {
    if (cfg.data instanceof FormData) {
      // Let browser set Content-Type with boundary for multipart
    } else if (cfg.data && typeof cfg.data === "object") {
      cfg.headers = Axios.AxiosHeaders.from(cfg.headers || {});
      cfg.headers.set("Content-Type", "application/json");
    }
    return authRequestInterceptor(cfg);
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use((response) => response.data, handleResponseError);

