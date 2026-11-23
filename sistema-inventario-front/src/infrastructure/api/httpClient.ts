import axios from "axios";
import { authStorage } from "../storage/authStorage";

export const httpClient = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

httpClient.interceptors.request.use(
  (config) => {
    const token = authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error?.config?.url ?? "";
    if (error?.response?.status === 401 && !url.includes("/auth/token")) {
      authStorage.clearToken();
      window.location.reload();
    }
    return Promise.reject(error);
  },
);
