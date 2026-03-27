export type VersionStatus = "draft" | "active" | "archived";
export type RuleKind = "max_message_chars" | "keyword_blocklist" | "pii_detector" | "json_format";
export type RuleStage = "input" | "output";
export type RuleAction = "allow" | "block" | "mask" | "log_only";

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
  description?: string;
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
  action: RuleAction;
  triggered?: boolean;
  outcome?: string;
  stage?: RuleStage;
  detail?: string;
  metadata?: Record<string, unknown>;
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
