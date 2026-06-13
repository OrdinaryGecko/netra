import { AdminSession, ApiErrorPayload, DryRunResult, PolicySetSummary, PolicyVersion, Project, Rule } from "./types";

type SessionPayload = {
  authenticated: boolean;
  api_key: { id: number; name: string };
  client_application: { id: number; name: string; key: string };
  project?: {
    id: number;
    name: string;
    key: string;
    organization: { id: number; name: string; slug: string };
  } | null;
};

type BackendProject = {
  id: number;
  name: string;
  key: string;
  upstream_base_url?: string | null;
  upstream_provider?: string | null;
  fail_mode: "open" | "closed";
  active: boolean;
  organization: { id: number; name: string; slug: string };
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
  apiKey?: string | null;
  projectId?: string | null;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ADMIN_API_KEY_STORAGE_KEY = "netra.adminApiKey";

function apiUrl(path: string) {
  return new URL(path, API_BASE_URL).toString();
}

export function storedAdminApiKey() {
  return window.localStorage.getItem(ADMIN_API_KEY_STORAGE_KEY);
}

export function storeAdminApiKey(apiKey: string) {
  window.localStorage.setItem(ADMIN_API_KEY_STORAGE_KEY, apiKey);
}

export function clearStoredAdminApiKey() {
  window.localStorage.removeItem(ADMIN_API_KEY_STORAGE_KEY);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const apiKey = options.apiKey === undefined ? storedAdminApiKey() : options.apiKey;
  if (apiKey) headers["X-Api-Key"] = apiKey;
  if (options.projectId) headers["X-Netra-Project-Id"] = options.projectId;

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
    description: String(policyVersion.definition?.description || "Guardrail policy version"),
    rules: (policyVersion.rules || []).map(mapRule),
  };
}

function mapProject(project: BackendProject): Project {
  return {
    id: String(project.id),
    organizationId: String(project.organization.id),
    name: project.name,
    slug: project.key,
    description: project.upstream_provider
      ? `${project.upstream_provider} runtime project`
      : "AI workload protected by Netra guardrails",
    key: project.key,
    upstreamBaseUrl: project.upstream_base_url,
    upstreamProvider: project.upstream_provider,
    failMode: project.fail_mode,
    active: project.active,
    organization: {
      id: String(project.organization.id),
      name: project.organization.name,
      slug: project.organization.slug,
    },
    policySetsCount: project.policy_sets_count,
  };
}

function mapSession(payload: SessionPayload): AdminSession {
  return {
    authenticated: payload.authenticated,
    apiKey: payload.api_key,
    clientApplication: payload.client_application,
    project: payload.project
      ? mapProject({
          id: payload.project.id,
          name: payload.project.name,
          key: payload.project.key,
          fail_mode: "open",
          active: true,
          organization: payload.project.organization,
          policy_sets_count: 0,
        })
      : null,
    organization: payload.project
      ? {
          id: String(payload.project.organization.id),
          name: payload.project.organization.name,
          slug: payload.project.organization.slug,
        }
      : null,
    user: payload.project
      ? {
          id: String(payload.api_key.id),
          email: `${payload.api_key.name.toLowerCase().replace(/\s+/g, "-")}@netra.local`,
          name: payload.api_key.name,
        }
      : null,
    membership: payload.project
      ? {
          id: `membership-${payload.api_key.id}`,
          userId: String(payload.api_key.id),
          organizationId: String(payload.project.organization.id),
          role: "owner",
        }
      : null,
  };
}

export async function getSession() {
  const payload = await request<SessionPayload>("/v1/admin/session");
  return mapSession(payload);
}

export async function createSession(apiKey: string) {
  const payload = await request<SessionPayload>("/v1/admin/session", {
    method: "POST",
    apiKey,
    body: { api_key: apiKey },
  });
  return mapSession(payload);
}

export async function destroySession() {
  clearStoredAdminApiKey();
  return Promise.resolve();
}

export async function fetchPolicySets(): Promise<PolicySetSummary[]> {
  const payload = await request<BackendPolicySet[]>("/v1/admin/policy_sets");
  return payload.map((policySet) => ({
    id: String(policySet.id),
    name: policySet.name,
    environment: policySet.environment,
    active: policySet.active,
    description: String(
      policySet.policy_versions?.[0]?.definition?.description ||
      `Policies for ${policySet.environment}`
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
      `Policies for ${policySet.environment}`
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
        fail_mode: "open",
        active: true,
        upstream_provider: "stub",
        upstream_base_url: null,
        encrypted_upstream_key: null,
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

export async function clonePolicyVersion(policyVersion: PolicyVersion, projectId?: string): Promise<PolicyVersion> {
  const payload = await request<BackendPolicyVersion>(`/v1/admin/policy_versions/${policyVersion.id}/clone`, {
    method: "POST",
    projectId,
    body: {
      policy_version: {
        version: `${policyVersion.version}-draft`,
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

export async function dryRunProject(projectId: string, content: string): Promise<DryRunResult> {
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
