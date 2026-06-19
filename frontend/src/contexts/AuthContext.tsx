import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { clearSessionToken, fetchProjects, login, logout, storedSessionToken, storeOrgSlug, storeSessionToken } from "@/lib/api";
import { AdminSession, Project, User } from "@/lib/types";

const USER_STORAGE_KEY = "netra.user";

function storedUser(): { id: string; email: string; name: string; role: string } | null {
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function storeUser(user: { id: string; email: string; name: string; role: string }) {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function clearUser() {
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: AdminSession | null;
  user: User | null;
  projects: Project[];
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  updateUser: (data: { name?: string; email?: string }) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const buildSession = useCallback((userData: { id: string; email: string; name: string; role: string }): AdminSession => {
    return {
      user: { id: userData.id, email: userData.email, name: userData.name, role: userData.role as User["role"] },
    };
  }, []);

  useEffect(() => {
    const token = storedSessionToken();
    const userData = storedUser();
    if (token && userData) {
      setSession(buildSession(userData));
      setIsAuthenticated(true);
      fetchProjects()
        .then(setProjects)
        .catch(() => {
          clearSessionToken();
          clearUser();
          setIsAuthenticated(false);
          setSession(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [buildSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await login(email, password);
    storeSessionToken(response.token);
    const userData = {
      id: String(response.user.id),
      email: response.user.email,
      name: response.user.name,
      role: response.user.role,
    };
    storeUser(userData);
    storeOrgSlug("");
    setSession(buildSession(userData));
    setIsAuthenticated(true);
    setProjects(await fetchProjects());
  }, [buildSession]);

  const signOut = useCallback(async () => {
    await logout();
    clearUser();
    setSession(null);
    setProjects([]);
    setIsAuthenticated(false);
  }, []);

  const refreshProjects = useCallback(async () => {
    setProjects(await fetchProjects());
  }, []);

  const updateUser = useCallback((data: { name?: string; email?: string }) => {
    setSession((prev) => {
      if (!prev) return prev;
      const updatedUser = { ...prev.user, ...data };
      storeUser({ id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role });
      return { ...prev, user: updatedUser };
    });
  }, []);

  const user = session?.user || null;

  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      session,
      user,
      projects,
      signIn,
      signOut,
      refreshProjects,
      updateUser,
    }),
    [isAuthenticated, isLoading, session, user, projects, signIn, signOut, refreshProjects, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useCurrentProject(projectId?: string): Project | null {
  const { projects } = useAuth();
  if (!projectId) return projects[0] || null;
  return projects.find((project) => project.id === projectId) ?? null;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const ROLE_LEVELS: Record<string, number> = {
  owner: 5,
  admin: 4,
  editor: 3,
  viewer: 2,
  auditor: 1,
};

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || "viewer";
  const level = ROLE_LEVELS[role] || 0;

  return {
    role,
    canManage: level >= 4,
    canEdit: level >= 3,
    canView: level >= 2,
    canViewLogs: level >= 1,
  };
}
