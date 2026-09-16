"use client";

import api from "@/lib/axios";
import { createContext,ReactNode,useContext,useEffect,useState } from "react";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "student" | "tutor" | "admin" | "pending" | "parent";
  avatar?: string;
  isVerified: boolean;
  isApproved: boolean;
  phone?: string;
  city?: string;
  countryCode?: string;
  currency?: string;
  preferredLanguage?: string;
  adminRole?: string;
  adminPermissions?: string[];
}

interface GoogleAuthResult {
  user: User;
  needsRole: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: "student" | "tutor" | "parent";
  phone?: string;
  city?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  loginWithGoogle: (idToken: string, role?: "student" | "tutor" | "parent") => Promise<GoogleAuthResult>;
  selectRole: (role: "student" | "tutor" | "parent") => Promise<User>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api
        .get("/auth/me")
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data: RegisterData) => {
    const res = await api.post("/auth/register", data);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const loginWithGoogle = async (
    idToken: string,
    role?: "student" | "tutor" | "parent"
  ): Promise<GoogleAuthResult> => {
    const res = await api.post("/auth/google", { idToken, role });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return { user: res.data.user, needsRole: res.data.needsRole };
  };

  const selectRole = async (role: "student" | "tutor" | "parent"): Promise<User> => {
    const res = await api.patch("/auth/select-role", { role });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data.message;
  };

  const resetPassword = async (
    email: string,
    otp: string,
    newPassword: string
  ): Promise<string> => {
    const res = await api.post("/auth/reset-password", { email, otp, newPassword });
    return res.data.message;
  };

  const logout = async () => {
    const token = localStorage.getItem("token");

    localStorage.removeItem("token");
    setUser(null);

    void api
      .post(
        "/auth/logout",
        undefined,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          timeout: 5000,
        }
      )
      .catch((err) => {
        console.error("Logout request failed:", err);
      });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        selectRole,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
