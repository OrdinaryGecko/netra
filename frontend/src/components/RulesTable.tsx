import { Rule } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RulesTableProps {
  rules: Rule[];
  isDraft: boolean;
  onToggle: (id: string) => void;
  onEdit: (rule: Rule) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const kindLabels: Record<string, string> = {
  max_message_chars: 'Max Chars',
  keyword_detector: 'Keyword Detect',
  pii_detector: 'PII Detector',
  json_format: 'JSON Format',
  ai_classifier: 'AI Classifier',
};

const classifierLabels: Record<string, string> = {
  profanity: 'Profanity',
  hate_speech: 'Hate Speech',
  harassment: 'Harassment',
  self_harm: 'Self-harm',
  jailbreak: 'Jailbreak',
  sexual_content: 'Sexual Content',
  violence: 'Violence',
  illegal_activity: 'Illegal Activity',
};

const actionColors: Record<string, string> = {
  allow: 'bg-status-active/10 text-status-active border-status-active',
  block: 'bg-destructive/10 text-destructive border-destructive',
  mask: 'bg-status-draft/10 text-status-draft border-status-draft',
  log_only: 'bg-secondary text-secondary-foreground border-border',
};

export function RulesTable({ rules, isDraft, onToggle, onEdit, onDelete, onAdd }: RulesTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold font-mono text-foreground uppercase tracking-wider">Rules</h2>
        {isDraft && (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Rule
          </Button>
        )}
      </div>
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="surface-elevated border-b border-border">
              <th className="text-left px-4 py-2.5 font-mono text-xs text-muted-foreground font-medium uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-2.5 font-mono text-xs text-muted-foreground font-medium uppercase tracking-wider">Kind</th>
              <th className="text-left px-4 py-2.5 font-mono text-xs text-muted-foreground font-medium uppercase tracking-wider">Stage</th>
              <th className="text-left px-4 py-2.5 font-mono text-xs text-muted-foreground font-medium uppercase tracking-wider">Action</th>
              <th className="text-center px-4 py-2.5 font-mono text-xs text-muted-foreground font-medium uppercase tracking-wider">Priority</th>
              <th className="text-center px-4 py-2.5 font-mono text-xs text-muted-foreground font-medium uppercase tracking-wider">Enabled</th>
              <th className="text-right px-4 py-2.5 font-mono text-xs text-muted-foreground font-medium uppercase tracking-wider w-24" />
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className={cn('border-b border-border last:border-0 transition-colors hover:bg-muted/50', !rule.enabled && 'opacity-50')}>
                <td className="px-4 py-3 font-medium text-foreground">{rule.name}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    {kindLabels[rule.kind]}
                    {rule.kind === 'ai_classifier' && (
                      <>
                        {' '}
                        / {classifierLabels[String(rule.config?.classifier || '')] || String(rule.config?.classifier || 'Unknown')}
                      </>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground uppercase">{rule.stage}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={cn('text-xs font-mono rounded-sm', actionColors[rule.action])}>
                    {rule.action}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground">{rule.priority}</td>
                <td className="px-4 py-3 text-center">
                  <Switch checked={rule.enabled} onCheckedChange={() => onToggle(rule.id)} disabled={!isDraft} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(rule)} title={isDraft ? 'Edit rule' : 'View rule'}>
                      {isDraft ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    {isDraft && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(rule.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No rules configured. {isDraft && 'Click "Add Rule" to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
