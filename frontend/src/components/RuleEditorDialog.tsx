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
  keyword_detector: {
    name: 'Keyword detector',
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
  ai_classifier: {
    name: 'AI classifier',
    stage: 'input',
    action: 'block',
    config: {
      classifier: 'jailbreak',
      scope: 'latest_user_message',
    },
  },
};

const ALLOWED_ACTIONS_BY_KIND: Record<RuleKind, RuleAction[]> = {
  max_message_chars: ['block', 'allow', 'log_only'],
  keyword_detector: ['block', 'mask', 'allow', 'log_only'],
  pii_detector: ['block', 'mask', 'allow', 'log_only'],
  json_format: ['block', 'allow', 'log_only'],
  ai_classifier: ['block', 'allow', 'log_only'],
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

const aiClassifiers = [
  { value: 'profanity', label: 'Profanity', description: 'Flags abusive, vulgar, or obscene language.' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Flags attacks against protected classes.' },
  { value: 'harassment', label: 'Harassment', description: 'Flags targeted abuse, bullying, or threats.' },
  { value: 'self_harm', label: 'Self-harm', description: 'Flags self-harm intent or instructions.' },
  { value: 'jailbreak', label: 'Jailbreak', description: 'Flags attempts to bypass system or policy instructions.' },
  { value: 'sexual_content', label: 'Sexual Content', description: 'Flags explicit sexual content.' },
  { value: 'violence', label: 'Violence', description: 'Flags violent threats or instructions.' },
  { value: 'illegal_activity', label: 'Illegal Activity', description: 'Flags requests to facilitate illegal activity.' },
];

export function RuleEditorDialog({ open, onClose, onSave, rule, readOnly = false }: RuleEditorDialogProps) {
  const [form, setForm] = useState<Omit<Rule, 'id'> & { id?: string }>(defaultRule);

  // Structured config fields
  const [maxChars, setMaxChars] = useState(4000);
  const [keywords, setKeywords] = useState('');
  const [replacement, setReplacement] = useState('');
  const [scope, setScope] = useState<RuleScope>('latest_user_message');
  const [messageCount, setMessageCount] = useState(4);
  const [classifier, setClassifier] = useState('jailbreak');

  useEffect(() => {
    if (rule) {
      setForm(rule);
      setMaxChars(Number(rule.config.max || 4000));
      setKeywords(Array.isArray(rule.config.keywords) ? (rule.config.keywords as string[]).join('\n') : '');
      setReplacement((rule.config.replacement as string) || '');
      setScope((rule.config.scope as RuleScope) || 'latest_user_message');
      setMessageCount(Number(rule.config.message_count || 4));
      setClassifier((rule.config.classifier as string) || 'jailbreak');
    } else {
      setForm(defaultRule);
      setMaxChars(4000);
      setKeywords('ignore previous instructions\nreveal system prompt');
      setReplacement('');
      setScope('latest_user_message');
      setMessageCount(4);
      setClassifier('jailbreak');
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
    setMaxChars(Number(template.config.max || 4000));
    setKeywords(Array.isArray(template.config.keywords) ? (template.config.keywords as string[]).join('\n') : '');
    setReplacement('');
    setScope((template.config.scope as RuleScope) || 'latest_user_message');
    setClassifier((template.config.classifier as string) || 'jailbreak');
  };

  const buildConfig = (): Record<string, unknown> => {
    const config: Record<string, unknown> = {};

    if (form.kind === 'max_message_chars') {
      config.max = maxChars;
    }
    if (form.kind === 'keyword_detector') {
      config.keywords = keywords.split('\n').filter((k) => k.trim());
      if (form.action === 'mask' && replacement) {
        config.replacement = replacement;
      }
    }
    if (form.kind === 'ai_classifier') {
      config.classifier = classifier;
    }
    if (form.stage === 'input') {
      config.scope = scope;
      if (scope === 'recent_messages') {
        config.message_count = messageCount;
      }
    }

    return config;
  };

  const handleSave = () => {
    onSave({
      id: form.id || `r-${Date.now()}`,
      name: form.name || 'Untitled Rule',
      kind: form.kind as RuleKind,
      stage: form.stage as RuleStage,
      action: form.action as RuleAction,
      priority: form.priority ?? 1,
      enabled: form.enabled ?? true,
      config: buildConfig(),
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
                  <SelectItem value="keyword_detector">Keyword Detector</SelectItem>
                  <SelectItem value="pii_detector">PII Detector</SelectItem>
                  <SelectItem value="json_format">JSON Format</SelectItem>
                  <SelectItem value="ai_classifier">AI Classifier</SelectItem>
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
                  {ALLOWED_ACTIONS_BY_KIND[form.kind as RuleKind]
                    ?.filter((action) => !(action === 'mask' && form.stage === 'output'))
                    .map((action) => (
                    <SelectItem key={action} value={action}>
                      {action === 'log_only' ? 'Log Only' : action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
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
                <Select value={scope} onValueChange={(v) => setScope(v as RuleScope)} disabled={readOnly}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ruleScopes.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {scope === 'recent_messages' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Message Count</Label>
                  <Input
                    type="number"
                    min={1}
                    value={messageCount}
                    onChange={(e) => setMessageCount(parseInt(e.target.value) || 1)}
                    disabled={readOnly}
                  />
                </div>
              )}
            </div>
          )}
          {form.kind === 'max_message_chars' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Max characters</Label>
              <Input
                type="number"
                min={1}
                value={maxChars}
                onChange={(e) => setMaxChars(parseInt(e.target.value) || 4000)}
                className="font-mono text-xs"
                disabled={readOnly}
              />
            </div>
          )}
          {form.kind === 'keyword_detector' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Keywords</Label>
              <Textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="One keyword per line"
                className="font-mono text-xs min-h-[80px]"
                disabled={readOnly}
              />
              <p className="text-[10px] font-mono text-muted-foreground">One keyword per line, case-insensitive matching</p>
            </div>
          )}
          {form.kind === 'keyword_detector' && form.action === 'mask' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Replacement word</Label>
              <Input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="[REDACTED]"
                className="font-mono text-xs"
                disabled={readOnly}
              />
              <p className="text-[10px] font-mono text-muted-foreground">Leave empty to default to [REDACTED]</p>
            </div>
          )}
          {form.kind === 'ai_classifier' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Classifier</Label>
                <Select value={classifier} onValueChange={setClassifier} disabled={readOnly}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {aiClassifiers.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {aiClassifiers.find((item) => item.value === classifier)?.description || 'Flags a preset content category using an internal judge.'}
                </p>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Config (JSON)</Label>
            <Textarea
              className="font-mono text-xs min-h-[80px]"
              value={JSON.stringify(buildConfig(), null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  if (parsed.max !== undefined) setMaxChars(Number(parsed.max));
                  if (parsed.keywords !== undefined) setKeywords(Array.isArray(parsed.keywords) ? parsed.keywords.join('\n') : '');
                  if (parsed.replacement !== undefined) setReplacement(String(parsed.replacement || ''));
                  if (parsed.scope !== undefined) setScope(parsed.scope as RuleScope);
                  if (parsed.message_count !== undefined) setMessageCount(Number(parsed.message_count));
                  if (parsed.classifier !== undefined) setClassifier(String(parsed.classifier || 'jailbreak'));
                } catch { /* ignore invalid JSON while typing */ }
              }}
              disabled={readOnly}
            />
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
