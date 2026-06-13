import { PolicyVersion, DryRunResult } from './types';

export const mockPolicyVersion: PolicyVersion = {
  id: 'pv-001',
  policySetId: 'ps-001',
  policySetName: 'Production Safety Policy',
  version: 3,
  status: 'draft',
  createdAt: '2026-03-20T10:00:00Z',
  updatedAt: '2026-03-27T14:30:00Z',
  description: 'Enhanced safety guardrails with PII detection and output format enforcement.',
  rules: [
    {
      id: 'r-001',
      name: 'Input length limit',
      kind: 'max_message_chars',
      stage: 'input',
      action: 'block',
      priority: 1,
      enabled: true,
      config: { max_chars: 4096 },
    },
    {
      id: 'r-002',
      name: 'Profanity filter',
      kind: 'keyword_detector',
      stage: 'input',
      action: 'block',
      priority: 2,
      enabled: true,
      config: { keywords: ['badword1', 'badword2'], case_sensitive: false },
    },
    {
      id: 'r-003',
      name: 'PII scrubber',
      kind: 'pii_detector',
      stage: 'output',
      action: 'mask',
      priority: 3,
      enabled: true,
      config: { types: ['email', 'phone', 'ssn'], replacement: '[REDACTED]' },
    },
    {
      id: 'r-004',
      name: 'JSON response validator',
      kind: 'json_format',
      stage: 'output',
      action: 'log_only',
      priority: 4,
      enabled: false,
      config: { schema: { type: 'object', required: ['response'] } },
    },
  ],
};

export function simulateDryRun(payload: string, rules: PolicyVersion['rules']): DryRunResult[] {
  return rules.map((rule) => {
    let triggered = false;
    let detail = 'No match';

    if (!rule.enabled) {
      return { ruleId: rule.id, ruleName: rule.name, action: rule.action, triggered: false, detail: 'Rule disabled' };
    }

    switch (rule.kind) {
      case 'max_message_chars': {
        const max = (rule.config.max_chars as number) || 4096;
        triggered = payload.length > max;
        detail = triggered ? `Message is ${payload.length} chars (max ${max})` : `Within limit (${payload.length}/${max})`;
        break;
      }
      case 'keyword_detector': {
        const keywords = (rule.config.keywords as string[]) || [];
        const lower = payload.toLowerCase();
        const found = keywords.filter((k) => lower.includes(k.toLowerCase()));
        triggered = found.length > 0;
        detail = triggered ? `Blocked keywords found: ${found.join(', ')}` : 'No blocked keywords found';
        break;
      }
      case 'pii_detector': {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
        const hasEmail = emailRegex.test(payload);
        const hasPhone = phoneRegex.test(payload);
        triggered = hasEmail || hasPhone;
        const types: string[] = [];
        if (hasEmail) types.push('email');
        if (hasPhone) types.push('phone');
        detail = triggered ? `PII detected: ${types.join(', ')}` : 'No PII detected';
        break;
      }
      case 'json_format': {
        try {
          JSON.parse(payload);
          detail = 'Valid JSON';
        } catch {
          triggered = true;
          detail = 'Invalid JSON format';
        }
        break;
      }
    }

    return { ruleId: rule.id, ruleName: rule.name, action: rule.action, triggered, detail };
  });
}
