import { useState, useEffect } from 'react';
import { Rule, RuleKind, RuleStage, RuleAction } from '@/lib/types';
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

const defaultRule: Omit<Rule, 'id'> = {
  name: '',
  kind: 'max_message_chars',
  stage: 'input',
  action: 'block',
  priority: 1,
  enabled: true,
  config: {},
};

export function RuleEditorDialog({ open, onClose, onSave, rule, readOnly = false }: RuleEditorDialogProps) {
  const [form, setForm] = useState<Omit<Rule, 'id'> & { id?: string }>(defaultRule);
  const [configStr, setConfigStr] = useState('{}');

  useEffect(() => {
    if (rule) {
      setForm(rule);
      setConfigStr(JSON.stringify(rule.config, null, 2));
    } else {
      setForm(defaultRule);
      setConfigStr('{}');
    }
  }, [rule, open]);

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
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as RuleKind })} disabled={readOnly}>
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
