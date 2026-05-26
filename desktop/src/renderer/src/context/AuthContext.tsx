import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { Cashier } from "../types";

type AuthContextValue = {
  user: Cashier | null;
  sessionId: string;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function newSessionId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Cashier | null>(() => {
    const raw = sessionStorage.getItem("fusionpos_user");
    return raw ? (JSON.parse(raw) as Cashier) : null;
  });
  const [sessionId, setSessionId] = useState(() => {
    return sessionStorage.getItem("fusionpos_session_id") || newSessionId();
  });

  useEffect(() => {
    if (!user) return;
    void window.fusionpos.registerSession(sessionId, user.id, user.display_name, user.role);
    const heartbeat = setInterval(() => {
      void window.fusionpos.touchSession(sessionId);
    }, 30_000);
    return () => {
      clearInterval(heartbeat);
      void window.fusionpos.unregisterSession(sessionId);
    };
  }, [user, sessionId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      sessionId,
      async login(username, password) {
        const result = await window.fusionpos.login(username, password);
        if (!result) return "Invalid username or password";
        const sid = newSessionId();
        setSessionId(sid);
        sessionStorage.setItem("fusionpos_session_id", sid);
        setUser(result);
        sessionStorage.setItem("fusionpos_user", JSON.stringify(result));
        await window.fusionpos.registerSession(sid, result.id, result.display_name, result.role);
        return null;
      },
      logout() {
        void window.fusionpos.unregisterSession(sessionId);
        setUser(null);
        sessionStorage.removeItem("fusionpos_user");
      },
    }),
    [user, sessionId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
