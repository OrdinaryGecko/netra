export type VersionStatus = 'draft' | 'active' | 'archived';
export type RuleKind = 'max_message_chars' | 'keyword_blocklist' | 'pii_detector' | 'json_format';
export type RuleStage = 'input' | 'output';
export type RuleAction = 'allow' | 'block' | 'mask' | 'log_only';

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

export interface PolicyVersion {
  id: string;
  policySetId: string;
  policySetName: string;
  version: number;
  status: VersionStatus;
  createdAt: string;
  updatedAt: string;
  description: string;
  rules: Rule[];
}

export interface DryRunResult {
  ruleId: string;
  ruleName: string;
  action: RuleAction;
  triggered: boolean;
  detail: string;
}
