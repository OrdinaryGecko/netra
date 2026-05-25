import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { clearStoredAdminApiKey, createSession, destroySession, getSession, storedAdminApiKey, storeAdminApiKey } from "@/lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (key: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!storedAdminApiKey()) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    getSession()
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        clearStoredAdminApiKey();
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (key: string) => {
    await createSession(key);
    storeAdminApiKey(key);
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    await destroySession();
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, signIn, signOut }),
    [isAuthenticated, isLoading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
