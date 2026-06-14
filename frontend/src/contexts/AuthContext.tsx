import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { clearSessionToken, fetchProjects, getMe, login, logout, storedSessionToken, storeSessionToken } from "@/lib/api";
import { AdminSession, Membership, Organization, Project, User } from "@/lib/types";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: AdminSession | null;
  user: User | null;
  organization: Organization | null;
  membership: Membership | null;
  projects: Project[];
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const hydrateFromUser = useCallback(async (userData: { id: number; email: string; name: string; membership: { id: number; organization_id: number; organization_name: string; organization_slug: string; role: string } | null }) => {
    if (!userData.membership) throw new Error("No organization membership");

    const sess: AdminSession = {
      user: { id: String(userData.id), email: userData.email, name: userData.name },
      organization: {
        id: String(userData.membership.organization_id),
        name: userData.membership.organization_name,
        slug: userData.membership.organization_slug,
      },
      membership: {
        id: String(userData.membership.id),
        userId: String(userData.id),
        organizationId: String(userData.membership.organization_id),
        role: userData.membership.role as Membership["role"],
      },
    };

    setSession(sess);
    setIsAuthenticated(true);
    setProjects(await fetchProjects());
  }, []);

  useEffect(() => {
    if (!storedSessionToken()) {
      setIsLoading(false);
      return;
    }

    getMe()
      .then(hydrateFromUser)
      .catch(() => {
        clearSessionToken();
        setSession(null);
        setProjects([]);
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoading(false));
  }, [hydrateFromUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await login(email, password);
    storeSessionToken(response.token);
    await hydrateFromUser(response.user);
  }, [hydrateFromUser]);

  const signOut = useCallback(async () => {
    await logout();
    setSession(null);
    setProjects([]);
    setIsAuthenticated(false);
  }, []);

  const refreshProjects = useCallback(async () => {
    setProjects(await fetchProjects());
  }, []);

  const organization = session?.organization || null;
  const user = session?.user || null;
  const membership = session?.membership || null;

  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      session,
      user,
      organization,
      membership,
      projects,
      signIn,
      signOut,
      refreshProjects,
    }),
    [isAuthenticated, isLoading, session, user, organization, membership, projects, signIn, signOut, refreshProjects]
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
  const { membership } = useAuth();
  const role = membership?.role || "viewer";
  const level = ROLE_LEVELS[role] || 0;

  return {
    role,
    canManage: level >= 4,      // owner, admin
    canEdit: level >= 3,        // owner, admin, editor
    canView: level >= 2,        // owner, admin, editor, viewer
    canViewLogs: level >= 1,    // all roles
  };
}
