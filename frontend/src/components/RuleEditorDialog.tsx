import { useState, useEffect } from 'react';
import { Rule, RuleKind, RuleStage, RuleAction, RuleScope } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RuleEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (rule: Rule) => void;
  rule: Rule | null;
  readOnly?: boolean;
}

const ruleTemplates: Record<RuleKind, {
  name: string;
  stage: RuleStage;
  action: RuleAction;
  config: Record<string, unknown>;
}> = {
  max_message_chars: {
    name: 'Input length limit',
    stage: 'input',
    action: 'block',
    config: {
      max: 4000,
      scope: 'latest_user_message',
    },
  },
  keyword_blocklist: {
    name: 'Keyword blocklist',
    stage: 'input',
    action: 'block',
    config: {
      keywords: [
        'ignore previous instructions',
        'reveal system prompt',
      ],
      scope: 'latest_user_message',
    },
  },
  pii_detector: {
    name: 'PII detector',
    stage: 'output',
    action: 'mask',
    config: {},
  },
  json_format: {
    name: 'JSON format validator',
    stage: 'output',
    action: 'block',
    config: {},
  },
};

const defaultRule: Omit<Rule, 'id'> = {
  name: ruleTemplates.max_message_chars.name,
  kind: 'max_message_chars',
  stage: 'input',
  action: 'block',
  priority: 1,
  enabled: true,
  config: {
    max: 4000,
    scope: 'latest_user_message',
  },
};

const ruleScopes: Array<{ value: RuleScope; label: string }> = [
  { value: 'latest_user_message', label: 'Latest User Message' },
  { value: 'latest_message', label: 'Latest Message' },
  { value: 'all_user_messages', label: 'All User Messages' },
  { value: 'system_messages', label: 'System Messages' },
  { value: 'recent_messages', label: 'Recent Messages' },
  { value: 'full_conversation', label: 'Full Conversation' },
];

export function RuleEditorDialog({ open, onClose, onSave, rule, readOnly = false }: RuleEditorDialogProps) {
  const [form, setForm] = useState<Omit<Rule, 'id'> & { id?: string }>(defaultRule);
  const [configStr, setConfigStr] = useState('{}');

  const parsedConfig = (() => {
    try {
      return JSON.parse(configStr) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  const selectedScope = (parsedConfig.scope as RuleScope | undefined) || 'latest_user_message';

  useEffect(() => {
    if (rule) {
      setForm(rule);
      setConfigStr(JSON.stringify(rule.config, null, 2));
    } else {
      setForm(defaultRule);
      setConfigStr(JSON.stringify(defaultRule.config, null, 2));
    }
  }, [rule, open]);

  const handleKindChange = (kind: RuleKind) => {
    const template = ruleTemplates[kind];
    const previousTemplate = ruleTemplates[form.kind as RuleKind];
    const nameIsDefault = !form.name || form.name === previousTemplate?.name;

    setForm((currentForm) => ({
      ...currentForm,
      kind,
      name: nameIsDefault ? template.name : currentForm.name,
      stage: template.stage,
      action: template.action,
      config: template.config,
    }));
    setConfigStr(JSON.stringify(template.config, null, 2));
  };

  const updateConfig = (updates: Record<string, unknown>) => {
    const nextConfig = {
      ...parsedConfig,
      ...updates,
    };

    setForm((currentForm) => ({
      ...currentForm,
      config: nextConfig,
    }));
    setConfigStr(JSON.stringify(nextConfig, null, 2));
  };

  const handleScopeChange = (scope: RuleScope) => {
    const nextConfig = {
      ...parsedConfig,
      scope,
    };

    if (scope === 'recent_messages') {
      nextConfig.message_count = parsedConfig.message_count || 4;
    } else {
      delete nextConfig.message_count;
    }

    setForm((currentForm) => ({
      ...currentForm,
      config: nextConfig,
    }));
    setConfigStr(JSON.stringify(nextConfig, null, 2));
  };

  const handleSave = () => {
    let parsedConfig: Record<string, unknown> = {};
    try {
      parsedConfig = JSON.parse(configStr);
    } catch {
      return;
    }
    onSave({
      id: form.id || `r-${Date.now()}`,
      name: form.name || 'Untitled Rule',
      kind: form.kind as RuleKind,
      stage: form.stage as RuleStage,
      action: form.action as RuleAction,
      priority: form.priority ?? 1,
      enabled: form.enabled ?? true,
      config: parsedConfig,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono">{readOnly ? 'View Rule' : rule ? 'Edit Rule' : 'New Rule'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {readOnly ? 'Rule details are read-only for active and archived policy versions.' : 'Configure the rule parameters below.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rule name" disabled={readOnly} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Kind</Label>
              <Select value={form.kind} onValueChange={(v) => handleKindChange(v as RuleKind)} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="max_message_chars">Max Chars</SelectItem>
                  <SelectItem value="keyword_blocklist">Keyword Blocklist</SelectItem>
                  <SelectItem value="pii_detector">PII Detector</SelectItem>
                  <SelectItem value="json_format">JSON Format</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as RuleStage })} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="input">Input</SelectItem>
                  <SelectItem value="output">Output</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Action</Label>
              <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v as RuleAction })} disabled={readOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="mask">Mask</SelectItem>
                  <SelectItem value="log_only">Log Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Priority</Label>
              <Input type="number" min={1} value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 1 })} disabled={readOnly} />
            </div>
          </div>
          {form.stage === 'input' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Scope</Label>
                <Select value={selectedScope} onValueChange={(v) => handleScopeChange(v as RuleScope)} disabled={readOnly}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ruleScopes.map((scope) => (
                      <SelectItem key={scope.value} value={scope.value}>{scope.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedScope === 'recent_messages' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Message Count</Label>
                  <Input
                    type="number"
                    min={1}
                    value={Number(parsedConfig.message_count || 4)}
                    onChange={(e) => updateConfig({ message_count: parseInt(e.target.value) || 1 })}
                    disabled={readOnly}
                  />
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Config (JSON)</Label>
            <Textarea className="font-mono text-xs min-h-[100px]" value={configStr} onChange={(e) => setConfigStr(e.target.value)} disabled={readOnly} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
          {!readOnly && <Button onClick={handleSave}>Save Rule</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
