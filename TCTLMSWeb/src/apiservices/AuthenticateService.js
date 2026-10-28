import { axios } from "../library/axios";
import {config} from "../library/config"

/*export const AuthenticateLogin = (formdata) => {
  console.log("Calling:", `${config.API_URL}/Auth/authenticate-user`);
  return axios.post("/Auth/authenticate-user", formdata);
};
*/ 
export const AuthenticateLogin = async (formdata) => {
  console.log("LOGIN API URL:", config.API_URL);

  try {
    const response = await axios.post(
      "/Auth/authenticate-user",
      formdata
    );

    console.log("LOGIN SUCCESS:", response.status);
    console.log("LOGIN RESPONSE:", response.data);

    return response;
  } catch (error) {
    console.error("LOGIN FAILED");
    console.error("Message:", error?.message);
    console.error("Code:", error?.code);
    console.error("Status:", error?.response?.status);
    console.error("Response:", error?.response?.data);

    // Temporary: show the actual Android error
    alert(
  "LOGIN DEBUG\n\n" +
  "API: " + config.API_URL + "\n\n" +
  "Origin: " + window.location.origin + "\n\n" +
  "Message: " + (error?.message || "Unknown") + "\n\n" +
  "Code: " + (error?.code || "None") + "\n\n" +
  "Status: " + (error?.response?.status || "No status") + "\n\n" +
  "Response: " +
  JSON.stringify(error?.response?.data || {})
);

    throw error;
  }
};
export const CompleteStudentLogin = (data) => {
  return axios.post("/Auth/complete-student-login", data);
};

export const ConfirmEmail = async (email) => {
  return await axios.get(`/Auth/confirm-email?email=${email}`);
};

export const GetUserPermission = (userId) => {
  return axios.get(`/Auth/get-user-claims?userId=${userId}`);
};

export const GetMenuByUser = (roleId) => {
  return axios.get(`/Auth/get-menu-by-user?roleId=${roleId}`);
};

export const GetRolePermission = () => {
  return axios.get(`/Auth/get-claims`);
};

export const UpdateRolePermission = (roleId, menuIds, type, value, userId) => {
  // Production security rejects PUT before it reaches the API. POST uses the
  // same authenticated action and retains the query contract.
  if (process.env.NODE_ENV !== "production") {
    console.info("[RolePermission] Sending POST", { roleId, menuIds, type, value });
  }

  return axios.post(
    `/Auth/update-user-claim?roleId=${roleId}&menuIds=${menuIds}&type=${type}&value=${value}&userId=${userId}`,
    {}
  ).then((response) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[RolePermission] Update succeeded", response);
    }
    return response;
  }).catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[RolePermission] Update failed", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }
    throw error;
  });
};

export const GetRoleMenuPermission = (roleId) => {
  return axios.get(`/Auth/get-role-menu-permission?roleId=${roleId}`);
};

export const ChangeUserPassword = async (formdata) => {
  try {
    return await axios.post("/Auth/change-password-authenticated", formdata);
  } catch (error) {
    // Keep password changes working while an older API deployment is still
    // serving the legacy authenticated route. Do not retry validation/auth errors.
    if (error?.response?.status === 404) {
      return axios.post("/Auth/change-password", formdata);
    }
    throw error;
  }
};

export const ResetUserPassword = (formdata) => {
  return axios.post("/Auth/change-password", formdata);
};

export const ForgotPasswordAPI = (email) => {
  return axios.post(`/Auth/forgot-password?email=${encodeURIComponent(email)}`, null, {
    skipErrorToast: true,
  });
};

export const GetHierarchyMenu = (roleId) => {
  return axios.get(`/RolePermission/gethierarchymenu?roleId=${roleId}`);
};
