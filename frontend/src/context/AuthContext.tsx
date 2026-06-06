import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import api from "@/lib/api";
import type { Role, User } from "@/types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  isAllowed: (roles: Role[]) => boolean;
};

type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  role: Role;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me/")
      .then((response) => setUser(response.data))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/token/", { email, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    const me = await api.get("/auth/me/");
    setUser(me.data);
  };

  const register = async (payload: RegisterPayload) => {
    await api.post("/auth/register/", payload);
    await login(payload.email, payload.password);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isAllowed: (roles: Role[]) => Boolean(user && roles.includes(user.role)),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
