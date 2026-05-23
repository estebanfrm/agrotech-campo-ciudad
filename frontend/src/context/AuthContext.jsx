import { createContext, useContext, useMemo, useState } from "react";

import { apiRequest, clearStoredSession, getStoredSession, saveStoredSession } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());

  const login = async (credentials) => {
    const data = await apiRequest("/auth/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    saveStoredSession(data);
    setSession(data);
    return data.user;
  };

  const register = async (payload) => {
    const data = await apiRequest("/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    saveStoredSession(data);
    setSession(data);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiRequest("/auth/logout/", { method: "POST" });
    } catch {
      // La sesión local se limpia igual si el token ya no existe en backend.
    }
    clearStoredSession();
    setSession(null);
  };

  const value = useMemo(
    () => ({
      token: session?.token || null,
      user: session?.user || null,
      isAuthenticated: Boolean(session?.token),
      login,
      register,
      logout,
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }
  return context;
}
