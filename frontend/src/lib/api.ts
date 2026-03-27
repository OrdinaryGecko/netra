import { ApiErrorPayload, DryRunResult, PolicySetSummary, PolicyVersion, Rule } from "./types";

type BackendPolicySet = {
  id: number;
  name: string;
  environment: string;
  active: boolean;
  policy_versions: Array<{
    id: number;
    version: string;
    status: "draft" | "active" | "archived";
    published_at?: string | null;
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
};

function csrfToken() {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = csrfToken();
  if (token) headers["X-CSRF-Token"] = token;

  const response = await fetch(path, {
    method: options.method || "GET",
    credentials: "same-origin",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    const message = payload?.details?.join(", ") || payload?.error || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

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

function mapPolicyVersion(policyVersion: BackendPolicyVersion, policySetName: string): PolicyVersion {
  return {
    id: String(policyVersion.id),
    policySetId: String(policyVersion.policy_set_id),
    policySetName,
    version: policyVersion.version,
    status: policyVersion.status,
    createdAt: policyVersion.created_at,
    updatedAt: policyVersion.updated_at,
    description: String(policyVersion.definition?.description || "Guardrail policy version"),
    rules: (policyVersion.rules || []).map(mapRule),
  };
}

export async function fetchPolicySets(): Promise<PolicySetSummary[]> {
  const payload = await request<BackendPolicySet[]>("/v1/admin/policy_sets");
  return payload.map((policySet) => ({
    id: String(policySet.id),
    name: policySet.name,
    environment: policySet.environment,
    active: policySet.active,
    policyVersions: (policySet.policy_versions || []).map((version) => ({
      id: String(version.id),
      version: version.version,
      status: version.status,
      publishedAt: version.published_at,
    })),
  }));
}

export async function fetchPolicyVersion(policyVersionId: string, policySetName: string): Promise<PolicyVersion> {
  const payload = await request<BackendPolicyVersion>(`/v1/admin/policy_versions/${policyVersionId}`);
  return mapPolicyVersion(payload, policySetName);
}

export async function publishPolicyVersion(policyVersionId: string, policySetName: string): Promise<PolicyVersion> {
  const payload = await request<BackendPolicyVersion>(`/v1/admin/policy_versions/${policyVersionId}/publish`, {
    method: "POST",
  });
  return mapPolicyVersion(payload, policySetName);
}

export async function clonePolicyVersion(policyVersion: PolicyVersion): Promise<PolicyVersion> {
  const payload = await request<BackendPolicyVersion>(`/v1/admin/policy_versions/${policyVersion.id}/clone`, {
    method: "POST",
    body: {
      policy_version: {
        version: `${policyVersion.version}-draft`,
        definition: {
          description: policyVersion.description,
        },
      },
    },
  });
  return mapPolicyVersion(payload, policyVersion.policySetName);
}

export async function createRule(policyVersionId: string, rule: Omit<Rule, "id">): Promise<Rule> {
  const payload = await request<BackendRule>("/v1/admin/rules", {
    method: "POST",
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

export async function updateRule(rule: Rule): Promise<Rule> {
  const payload = await request<BackendRule>(`/v1/admin/rules/${rule.id}`, {
    method: "PATCH",
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

export async function deleteRule(ruleId: string): Promise<void> {
  await request(`/v1/admin/rules/${ruleId}`, { method: "DELETE" });
}

export async function dryRunPolicyVersion(policyVersionId: string, content: string): Promise<DryRunResult> {
  const payload = await request<{
    status: "allowed" | "blocked";
    action: Rule["action"];
    reasons: string[];
    trace_id: string;
    provider_response: Record<string, unknown> | null;
    evaluations: DryRunEvaluation[];
  }>(`/v1/admin/policy_versions/${policyVersionId}/test`, {
    method: "POST",
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
