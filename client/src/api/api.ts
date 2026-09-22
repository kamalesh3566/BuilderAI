import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

/**
 * Scoped in-memory token state
 * Prevents persistent unencrypted credential exposure in long-term storage
 */
let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      sessionStorage.setItem("builder_session_token", token);
    } else {
      sessionStorage.removeItem("builder_session_token");
      localStorage.removeItem("builder_auth_token");
    }
  }
}

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== "undefined") {
    const sessionToken = sessionStorage.getItem("builder_session_token");
    if (sessionToken) {
      inMemoryToken = sessionToken;
      return sessionToken;
    }
    // Fallback for cross-domain sessions
    const localToken = localStorage.getItem("builder_auth_token");
    if (localToken) {
      inMemoryToken = localToken;
      return localToken;
    }
  }
  return null;
}

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || "",
  withCredentials: true, // Primary credential channel (HttpOnly, Secure cookies)
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
