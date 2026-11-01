import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://api.tutorera.ac.pk/api/v1",
  withCredentials: true,
});

// Centralized 401 handling — if any request comes back unauthorized (expired/invalidated
// token, suspended account, etc.), redirect to login. The httpOnly cookie is cleared
// server-side on logout; we only need to handle the UI redirect here.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      const url = error.config?.url ?? "";
      const isAuthRoute = url.includes("/auth/login")
        || url.includes("/auth/register")
        || url.includes("/auth/logout")
        || url.includes("/auth/me");
      if (!isAuthRoute && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
