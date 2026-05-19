import axios from "../../../services/axiosInstance";

const AUTH_BASE_PATH = "/api/auth";

export const loginUser = (data) => {
  return axios.post(`${AUTH_BASE_PATH}/login`, data);
};
export const registerUser = (data) => {
  return axios.post(`${AUTH_BASE_PATH}/register`, data);
};

export const refreshToken = () => {
  return axios.post(`${AUTH_BASE_PATH}/refresh-token`);
};

export const exchangeGoogleOAuthCode = (data) => {
  return axios.post(`${AUTH_BASE_PATH}/google/exchange`, data);
};

export const logoutUser = () => {
  return axios.get(`${AUTH_BASE_PATH}/logoutUser`);
};

export const forgotPassword = (data) =>
  axios.post(`${AUTH_BASE_PATH}/forgot-password`, data);

export const verifyEmail = (data) =>
  axios.post(`${AUTH_BASE_PATH}/verify-email`, data);

export const checkEmailVerification = (email) =>
  axios.get(`${AUTH_BASE_PATH}/check-verification`, {
    params: { email },
  });

export const resendVerification = (data) =>
  axios.post(`${AUTH_BASE_PATH}/resend-verification`, data);

export const verifyResetPasswordToken = (token) =>
  axios.get(`${AUTH_BASE_PATH}/reset-password/${token}`);

export const resetPassword = (token, data) =>
  axios.post(`${AUTH_BASE_PATH}/reset-password/${token}`, data);

export const getRefreshTokenUrl = () =>
  `${import.meta.env.VITE_API_BASE_URL}${AUTH_BASE_PATH}/refresh-token`;

export const getGoogleAuthUrl = () =>
  `${import.meta.env.VITE_API_BASE_URL}${AUTH_BASE_PATH}/google`;

export const getGoogleAuthCallbackUrl = () =>
  `${import.meta.env.VITE_API_BASE_URL}${AUTH_BASE_PATH}/google/callback`;
