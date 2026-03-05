import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, type ApiError } from "../lib/api";

export type User = {
  id: string;
  createdAt?: number;
  expiresAt?: number;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  error: ApiError | null;
  refresh: () => Promise<User | null>;
  clear: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthContext missing");
  return ctx;
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef<Promise<User | null> | null>(null);
  const lastOkAtRef = useRef(0);

  const refresh = useCallback(async (): Promise<User | null> => {
    const now = Date.now();

    if (user && now - lastOkAtRef.current < 5000) return user;

    if (inFlightRef.current) return inFlightRef.current;

    const p = api
      .get<{ user: User }>("/auth/me")
      .then((res) => {
        setError(null);
        setUser(res.user);
        setLoading(false);
        lastOkAtRef.current = Date.now();
        return res.user;
      })
      .catch((e) => {
        setUser(null);
        setError(e as ApiError);
        setLoading(false);
        return null;
      })
      .finally(() => {
        inFlightRef.current = null;
      });

    inFlightRef.current = p;
    return p;
  }, [user]);

  const clear = useCallback(() => {
    setUser(null);
    setError(null);
    setLoading(false);
    inFlightRef.current = null;
    lastOkAtRef.current = 0;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, error, refresh, clear }),
    [user, loading, error, refresh, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};