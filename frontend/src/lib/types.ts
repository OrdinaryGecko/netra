export type VersionStatus = "draft" | "active" | "archived";
export type RuleKind = "max_message_chars" | "keyword_blocklist" | "pii_detector" | "json_format";
export type RuleStage = "input" | "output";
export type RuleAction = "allow" | "block" | "mask" | "log_only";
export type RuleScope = "latest_user_message" | "latest_message" | "all_user_messages" | "system_messages" | "recent_messages" | "full_conversation";

export type MembershipRole = "owner" | "admin" | "editor" | "viewer" | "auditor";

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  environment: "production" | "staging" | "development";
  policySetsCount: number;
  updatedAt?: string | null;
  key: string;
  defaultEnvironment: string;
  upstreamBaseUrl?: string | null;
  upstreamProvider?: string | null;
  failMode: "open" | "closed";
  active: boolean;
  organization: Organization;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
}

export interface AdminSession {
  authenticated: boolean;
  apiKey: { id: number; name: string };
  clientApplication: { id: number; name: string; key: string };
  project?: Project | null;
  organization?: Organization | null;
  user?: User | null;
  membership?: Membership | null;
}

export interface Rule {
  id: string;
  name: string;
  kind: RuleKind;
  stage: RuleStage;
  action: RuleAction;
  priority: number;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface PolicyVersionSummary {
  id: string;
  version: string;
  status: VersionStatus;
  publishedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  description?: string;
  rulesCount?: number;
}

export interface PolicyVersion {
  id: string;
  policySetId: string;
  policySetName: string;
  policySetEnvironment: string;
  version: string;
  status: VersionStatus;
  createdAt: string;
  updatedAt: string;
  description: string;
  rules: Rule[];
}

export interface PolicySetSummary {
  id: string;
  name: string;
  environment: string;
  active: boolean;
  description: string;
  policyVersions: PolicyVersionSummary[];
}

export interface DryRunEvaluation {
  rule_id?: number;
  rule_name?: string;
  ruleName?: string;
  rule_kind?: RuleKind;
  action: RuleAction;
  triggered?: boolean;
  outcome?: string;
  stage?: RuleStage;
  detail?: string;
  details?: Record<string, unknown>;
}

export interface DryRunResult {
  status: "allowed" | "blocked";
  action: RuleAction;
  reasons: string[];
  traceId: string;
  providerResponse: Record<string, unknown> | null;
  evaluations: DryRunEvaluation[];
}

export interface ApiErrorPayload {
  error: string;
  details?: string[];
}
