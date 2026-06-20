import { ApiErrorPayload, DryRunResult, PolicySetSummary, PolicyVersion, Project, Rule } from "./types";

type BackendProject = {
  id: number;
  name: string;
  key: string;
  upstream_base_url?: string | null;
  upstream_provider?: string | null;
  default_model?: string | null;
  active: boolean;
  policy_sets_count: number;
};

type BackendPolicySet = {
  id: number;
  name: string;
  environment: string;
  active: boolean;
  enabled?: boolean;
  priority?: number;
  policy_versions: Array<{
    id: number;
    version: string;
    status: "draft" | "active" | "archived";
    published_at?: string | null;
    updated_at?: string;
    created_at?: string;
    definition?: Record<string, unknown>;
    rules_count?: number;
  }>;
};

type BackendRule = {
  id: number;
  name: string;
  kind: Rule["kind"];
  stage: Rule["stage"];
  action: Rule["action"];
  priority: number;
  enabled: boolean;
  config: Record<string, unknown>;
};

type BackendPolicyVersion = {
  id: number;
  policy_set_id: number;
  policy_set_name: string;
  policy_set_environment: string;
  version: string;
  status: PolicyVersion["status"];
  created_at: string;
  updated_at: string;
  definition: Record<string, unknown>;
  rules: BackendRule[];
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  projectId?: string | null;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const SESSION_TOKEN_KEY = "netra.sessionToken";
const ORG_SLUG_KEY = "netra.orgSlug";

function apiUrl(path: string) {
  return new URL(path, API_BASE_URL).toString();
}

export function getOrgSlug(): string {
  // Try subdomain first (e.g. acme.netra.local → acme, acme.localhost → acme)
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
    // e.g. default.localhost → ["default", "localhost"]
    if (parts.length === 2 && parts[0] !== "localhost") return parts[0];
  }
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (subdomain !== "www") return subdomain;
  }
  // Fall back to stored value
  return window.localStorage.getItem(ORG_SLUG_KEY) || "";
}

export function storeOrgSlug(slug: string) {
  window.localStorage.setItem(ORG_SLUG_KEY, slug);
}

export function storedSessionToken() {
  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

export function storeSessionToken(token: string) {
  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSessionToken() {
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  window.localStorage.removeItem(ORG_SLUG_KEY);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const token = storedSessionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.projectId) headers["X-Netra-Project-Id"] = options.projectId;

  const orgSlug = getOrgSlug();
  if (orgSlug) headers["X-Netra-Org-Slug"] = orgSlug;

  const response = await fetch(apiUrl(path), {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    const message = payload?.details?.join(", ") || payload?.error || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

function mapRule(rule: BackendRule): Rule {
  return {
    id: String(rule.id),
    name: rule.name,
    kind: rule.kind,
    stage: rule.stage,
    action: rule.action,
    priority: rule.priority,
    enabled: rule.enabled,
    config: rule.config || {},
  };
}

function mapPolicyVersion(policyVersion: BackendPolicyVersion): PolicyVersion {
  return {
    id: String(policyVersion.id),
    policySetId: String(policyVersion.policy_set_id),
    policySetName: policyVersion.policy_set_name,
    policySetEnvironment: policyVersion.policy_set_environment,
    version: policyVersion.version,
    status: policyVersion.status,
    createdAt: policyVersion.created_at,
    updatedAt: policyVersion.updated_at,
    description: String(policyVersion.definition?.description || `Policy for ${policyVersion.policy_set_environment}`),
    rules: (policyVersion.rules || []).map(mapRule),
  };
}

function mapProject(project: BackendProject): Project {
  return {
    id: String(project.id),
    name: project.name,
    slug: project.key,
    description: project.upstream_provider
      ? `${project.upstream_provider} runtime project`
      : "AI workload protected by Netra guardrails",
    key: project.key,
    upstreamBaseUrl: project.upstream_base_url,
    upstreamProvider: project.upstream_provider,
    defaultModel: project.default_model,
    active: project.active,
    policySetsCount: project.policy_sets_count,
  };
}


type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

export async function login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const orgSlug = getOrgSlug();
  if (orgSlug) headers["X-Netra-Org-Slug"] = orgSlug;

  const response = await fetch(apiUrl("/v1/auth/sign_in"), {
    method: "POST",
    headers,
    body: JSON.stringify({ user: { email, password } }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new Error(payload?.error || payload?.details?.join(", ") || "Invalid email or password");
  }

  const token = response.headers.get("Authorization")?.replace("Bearer ", "") || "";
  const data = await response.json() as { user: AuthUser };

  return { user: data.user, token };
}

export async function logout(): Promise<void> {
  await request("/v1/auth/sign_out", { method: "DELETE" }).catch(() => {});
  clearSessionToken();
}

export async function fetchPolicySets(): Promise<PolicySetSummary[]> {
  const payload = await request<BackendPolicySet[]>("/v1/admin/policy_sets");
  return payload.map((policySet) => ({
    id: String(policySet.id),
    name: policySet.name,
    environment: policySet.environment,
    active: policySet.active,
    enabled: policySet.enabled ?? true,
    priority: policySet.priority ?? 100,
    description: String(
      policySet.policy_versions?.[0]?.definition?.description ||
      `Policy for ${policySet.environment}`
    ),
    policyVersions: (policySet.policy_versions || []).map((version) => ({
      id: String(version.id),
      version: version.version,
      status: version.status,
      publishedAt: version.published_at,
      updatedAt: version.updated_at || null,
      createdAt: version.created_at || null,
      description: String(version.definition?.description || ""),
      rulesCount: version.rules_count || 0,
    })),
  }));
}

export async function fetchPolicySetsForProject(projectId: string, environment?: string): Promise<PolicySetSummary[]> {
  const path = environment ? `/v1/admin/policy_sets?environment=${encodeURIComponent(environment)}` : "/v1/admin/policy_sets";
  const payload = await request<BackendPolicySet[]>(path, { projectId });
  return payload.map((policySet) => ({
    id: String(policySet.id),
    name: policySet.name,
    environment: policySet.environment,
    active: policySet.active,
    enabled: policySet.enabled ?? true,
    priority: policySet.priority ?? 100,
    description: String(
      policySet.policy_versions?.[0]?.definition?.description ||
      `Policy for ${policySet.environment}`
    ),
    policyVersions: (policySet.policy_versions || []).map((version) => ({
      id: String(version.id),
      version: version.version,
      status: version.status,
      publishedAt: version.published_at,
      updatedAt: version.updated_at || null,
      createdAt: version.created_at || null,
      description: String(version.definition?.description || ""),
      rulesCount: version.rules_count || 0,
    })),
  }));
}

export async function fetchProjects(): Promise<Project[]> {
  const payload = await request<BackendProject[]>("/v1/admin/projects");
  return payload.map(mapProject);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createProject(params: {
  name: string;
  description: string;
  projectId?: string;
}): Promise<Project> {
  const baseKey = slugify(params.name) || `project-${Date.now()}`;
  const payload = await request<BackendProject>("/v1/admin/projects", {
    method: "POST",
    projectId: params.projectId,
    body: {
      project: {
        name: params.name,
        key: baseKey,
        active: true,
        upstream_provider: "stub",
        upstream_base_url: null,
        upstream_key: null,
      },
    },
  });
  return mapProject(payload);
}

export async function fetchPolicyVersion(policyVersionId: string, projectId?: string): Promise<PolicyVersion> {
  const payload = await request<BackendPolicyVersion>(`/v1/admin/policy_versions/${policyVersionId}`, { projectId });
  return mapPolicyVersion(payload);
}

export async function publishPolicyVersion(policyVersionId: string, projectId?: string): Promise<PolicyVersion> {
  const payload = await request<BackendPolicyVersion>(`/v1/admin/policy_versions/${policyVersionId}/publish`, {
    method: "POST",
    projectId,
  });
  return mapPolicyVersion(payload);
}

export async function clonePolicyVersion(policyVersion: PolicyVersion, projectId?: string, versionName?: string): Promise<PolicyVersion> {
  const payload = await request<BackendPolicyVersion>(`/v1/admin/policy_versions/${policyVersion.id}/clone`, {
    method: "POST",
    projectId,
    body: {
      policy_version: {
        version: versionName || `${policyVersion.version}-draft`,
        definition: {
          description: policyVersion.description,
        },
      },
    },
  });
  return mapPolicyVersion(payload);
}

export async function createPolicySet(params: { name: string; environment: string; description: string; projectId?: string }) {
  const policySet = await request<{ id: number; name: string; environment: string; active: boolean }>("/v1/admin/policy_sets", {
    method: "POST",
    projectId: params.projectId,
    body: {
      policy_set: {
        name: params.name,
        environment: params.environment,
        active: true,
      },
    },
  });

  const policyVersion = await request<BackendPolicyVersion>("/v1/admin/policy_versions", {
    method: "POST",
    projectId: params.projectId,
    body: {
      policy_version: {
        policy_set_id: policySet.id,
        version: "1",
        status: "draft",
        definition: {
          description: params.description,
        },
      },
    },
  });

  return {
    policySetId: String(policySet.id),
    policyVersion: mapPolicyVersion(policyVersion),
  };
}

export async function togglePolicySetEnabled(policySetId: string, enabled: boolean, projectId?: string): Promise<void> {
  await request(`/v1/admin/policy_sets/${policySetId}`, {
    method: "PATCH",
    projectId,
    body: { policy_set: { enabled } },
  });
}

export async function createRule(policyVersionId: string, rule: Omit<Rule, "id">, projectId?: string): Promise<Rule> {
  const payload = await request<BackendRule>("/v1/admin/rules", {
    method: "POST",
    projectId,
    body: {
      rule: {
        policy_version_id: policyVersionId,
        name: rule.name,
        kind: rule.kind,
        stage: rule.stage,
        action: rule.action,
        priority: rule.priority,
        enabled: rule.enabled,
        config: rule.config,
      },
    },
  });
  return mapRule(payload);
}

export async function updateRule(rule: Rule, projectId?: string): Promise<Rule> {
  const payload = await request<BackendRule>(`/v1/admin/rules/${rule.id}`, {
    method: "PATCH",
    projectId,
    body: {
      rule: {
        name: rule.name,
        kind: rule.kind,
        stage: rule.stage,
        action: rule.action,
        priority: rule.priority,
        enabled: rule.enabled,
        config: rule.config,
      },
    },
  });
  return mapRule(payload);
}

export async function deleteRule(ruleId: string, projectId?: string): Promise<void> {
  await request(`/v1/admin/rules/${ruleId}`, { method: "DELETE", projectId });
}

export async function dryRunPolicyVersion(policyVersionId: string, content: string, projectId?: string): Promise<DryRunResult> {
  const payload = await request<{
    status: "allowed" | "blocked";
    action: Rule["action"];
    reasons: string[];
    trace_id: string;
    provider_response: Record<string, unknown> | null;
    evaluations: DryRunResult["evaluations"];
  }>(`/v1/admin/policy_versions/${policyVersionId}/test`, {
    method: "POST",
    projectId,
    body: {
      provider: "stub",
      model: "stub-v1",
      messages: [
        {
          role: "user",
          content,
        },
      ],
    },
  });

  return {
    status: payload.status,
    action: payload.action,
    reasons: payload.reasons || [],
    traceId: payload.trace_id,
    providerResponse: payload.provider_response,
    evaluations: payload.evaluations || [],
  };
}

export async function dryRunProject(
  projectId: string,
  content: string,
  environment?: string,
  options?: { executeProvider?: boolean; provider?: string; model?: string }
): Promise<DryRunResult> {
  const payload = await request<{
    status: "allowed" | "blocked";
    action: Rule["action"];
    reasons: string[];
    trace_id: string;
    provider_response: Record<string, unknown> | null;
    evaluations: DryRunResult["evaluations"];
  }>(`/v1/admin/projects/${projectId}/dry_run`, {
    method: "POST",
    projectId,
    body: {
      environment,
      provider: options?.provider || "stub",
      model: options?.model || "stub-v1",
      execute_provider: options?.executeProvider || false,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    },
  });

  return {
    status: payload.status,
    action: payload.action,
    reasons: payload.reasons || [],
    traceId: payload.trace_id,
    providerResponse: payload.provider_response,
    evaluations: payload.evaluations || [],
  };
}

export async function updateProject(projectId: string, params: {
  name?: string;
  upstream_provider?: string | null;
  upstream_base_url?: string | null;
  upstream_key?: string;
  active?: boolean;
}): Promise<Project> {
  const payload = await request<BackendProject>(`/v1/admin/projects/${projectId}`, {
    method: "PATCH",
    projectId,
    body: { project: params },
  });
  return mapProject(payload);
}

export async function updatePolicySet(policySetId: string, params: {
  name?: string;
  environment?: string;
  priority?: number;
  active?: boolean;
  enabled?: boolean;
}, projectId?: string): Promise<void> {
  await request(`/v1/admin/policy_sets/${policySetId}`, {
    method: "PATCH",
    projectId,
    body: { policy_set: params },
  });
}

export async function updatePolicyVersion(policyVersionId: string, params: {
  version?: string;
  definition?: Record<string, unknown>;
}, projectId?: string): Promise<PolicyVersion> {
  const payload = await request<BackendPolicyVersion>(`/v1/admin/policy_versions/${policyVersionId}`, {
    method: "PATCH",
    projectId,
    body: { policy_version: params },
  });
  return mapPolicyVersion(payload);
}

// Member management
export type MemberResponse = {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
};

export async function fetchMembers(): Promise<MemberResponse[]> {
  return request<MemberResponse[]>("/v1/admin/users");
}

export async function inviteMember(params: { email: string; name?: string; role: string }): Promise<MemberResponse> {
  return request<MemberResponse>("/v1/admin/users", {
    method: "POST",
    body: { user: params },
  });
}

export async function updateMemberRole(userId: number, role: string): Promise<MemberResponse> {
  return request<MemberResponse>(`/v1/admin/users/${userId}`, {
    method: "PATCH",
    body: { user: { role } },
  });
}

export async function removeMember(userId: number): Promise<void> {
  await request(`/v1/admin/users/${userId}`, { method: "DELETE" });
}

// Profile
export async function updateProfile(params: { name?: string; email?: string }): Promise<void> {
  await request("/v1/admin/users/update_profile", { method: "PATCH", body: params });
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request("/v1/admin/users/update_password", {
    method: "PATCH",
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

// Password reset
export async function forgotPassword(email: string): Promise<void> {
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  const orgSlug = getOrgSlug();
  if (orgSlug) headers["X-Netra-Org-Slug"] = orgSlug;
  const response = await fetch(apiUrl("/v1/auth/password"), {
    method: "POST",
    headers,
    body: JSON.stringify({ user: { email } }),
  });
  if (!response.ok) throw new Error("Request failed");
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  const orgSlug = getOrgSlug();
  if (orgSlug) headers["X-Netra-Org-Slug"] = orgSlug;
  const response = await fetch(apiUrl("/v1/auth/password"), {
    method: "PATCH",
    headers,
    body: JSON.stringify({ user: { reset_password_token: token, password: newPassword, password_confirmation: newPassword } }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.details?.join(", ") || payload?.error || "Reset failed");
  }
}

// API Keys
export type ApiKeyResponse = {
  id: number;
  name: string;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
  token_hint?: string | null;
  token?: string;
};

export async function fetchApiKeys(projectId: string): Promise<ApiKeyResponse[]> {
  return request<ApiKeyResponse[]>(`/v1/admin/projects/${projectId}/api_keys`);
}

export async function createApiKey(projectId: string, name: string): Promise<ApiKeyResponse> {
  return request<ApiKeyResponse>(`/v1/admin/projects/${projectId}/api_keys`, {
    method: "POST",
    body: { api_key: { name } },
  });
}

export async function revokeApiKey(projectId: string, keyId: number): Promise<void> {
  await request(`/v1/admin/projects/${projectId}/api_keys/${keyId}`, { method: "DELETE" });
}

// Request logs
export type RequestLogEntry = {
  id: number;
  trace_id: string;
  environment: string;
  provider: string;
  model: string;
  status: "pending" | "allowed" | "blocked";
  action: string | null;
  reasons: string[];
  agent: string | null;
  occurred_at: string;
  evaluations_count: number;
};

export type RequestLogDetail = RequestLogEntry & {
  messages: Array<{ role: string; content: string }>;
  response_payload: Record<string, unknown>;
  decision: Record<string, unknown>;
  request_metadata: Record<string, unknown>;
  evaluations: Array<{
    id: number;
    stage: string;
    rule_name: string;
    rule_kind: string;
    outcome: string;
    action: string;
    details: Record<string, unknown>;
    latency_ms: number;
  }>;
};

export async function fetchRequestLogs(params?: { project_id?: string; status?: string; environment?: string; limit?: number; offset?: number }): Promise<{ requests: RequestLogEntry[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.project_id) query.set("project_id", params.project_id);
  if (params?.status) query.set("status", params.status);
  if (params?.environment) query.set("environment", params.environment);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  return request<{ requests: RequestLogEntry[]; total: number }>(`/v1/admin/request_logs${qs ? `?${qs}` : ""}`);
}

export async function fetchRequestLog(id: number): Promise<RequestLogDetail> {
  return request<RequestLogDetail>(`/v1/admin/request_logs/${id}`);
}
