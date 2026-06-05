import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { clearStoredAdminApiKey, createSession, destroySession, fetchProjects, getSession, storedAdminApiKey, storeAdminApiKey } from "@/lib/api";
import { AdminSession, Membership, Organization, Project, User } from "@/lib/types";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: AdminSession | null;
  apiKey: string | null;
  user: User | null;
  organization: Organization | null;
  membership: Membership | null;
  projects: Project[];
  signIn: (key: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const hydrateSession = useCallback(async (payload: AdminSession) => {
    setSession(payload);
    setIsAuthenticated(true);
    setProjects(await fetchProjects());
  }, []);

  useEffect(() => {
    if (!storedAdminApiKey()) {
      setSession(null);
      setProjects([]);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    getSession()
      .then(hydrateSession)
      .catch(() => {
        clearStoredAdminApiKey();
        setSession(null);
        setProjects([]);
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoading(false));
  }, [hydrateSession]);

  const signIn = useCallback(async (key: string) => {
    const payload = await createSession(key);
    storeAdminApiKey(key);
    await hydrateSession(payload);
  }, [hydrateSession]);

  const signOut = useCallback(async () => {
    await destroySession();
    setSession(null);
    setProjects([]);
    setIsAuthenticated(false);
  }, []);

  const organization = session?.organization || session?.project?.organization || null;
  const user = session?.user || null;
  const membership = session?.membership || null;
  const apiKey = storedAdminApiKey();

  const value = useMemo(
    () => ({
      apiKey,
      isAuthenticated,
      isLoading,
      session,
      user,
      organization,
      membership,
      projects,
      signIn,
      signOut,
    }),
    [apiKey, isAuthenticated, isLoading, session, user, organization, membership, projects, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useCurrentProject(projectId?: string): Project | null {
  const { projects, session } = useAuth();
  if (!projectId) return session?.project || null;
  return projects.find((project) => project.id === projectId) ?? null;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
