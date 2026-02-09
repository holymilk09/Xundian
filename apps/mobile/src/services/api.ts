import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../utils/constants';
import { useAuthStore } from '../stores/useAuthStore';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshed = await useAuthStore.getState().refreshAuth();
        if (refreshed && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
          return api(originalRequest);
        }
      } catch {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  },
);
