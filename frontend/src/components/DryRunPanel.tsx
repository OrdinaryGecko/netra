import { useState } from 'react';
import { Rule, DryRunResult } from '@/lib/types';
import { simulateDryRun } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DryRunPanelProps {
  rules: Rule[];
}

const actionIcons: Record<string, typeof CheckCircle2> = {
  allow: CheckCircle2,
  block: XCircle,
  mask: AlertTriangle,
  log_only: Info,
};

const actionResultColors: Record<string, string> = {
  allow: 'text-status-active',
  block: 'text-destructive',
  mask: 'text-status-draft',
  log_only: 'text-muted-foreground',
};

export function DryRunPanel({ rules }: DryRunPanelProps) {
  const [payload, setPayload] = useState('Hello, my email is john@example.com and my phone is 555-123-4567.');
  const [results, setResults] = useState<DryRunResult[] | null>(null);

  const handleRun = () => {
    setResults(simulateDryRun(payload, rules));
  };

  const triggered = results?.filter((r) => r.triggered) || [];
  const blocked = triggered.some((r) => r.action === 'block');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold font-mono text-foreground uppercase tracking-wider">Dry Run</h2>
        <Button size="sm" onClick={handleRun}>
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Run Test
        </Button>
      </div>
      <Textarea
        className="font-mono text-xs min-h-[100px]"
        placeholder="Paste a sample request payload..."
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
      />
      {results && (
        <div className="space-y-3">
          <div className={cn('rounded-md border px-4 py-3 flex items-center gap-2', blocked ? 'border-destructive bg-destructive/5' : 'border-status-active bg-status-active/5')}>
            {blocked ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-status-active" />}
            <span className={cn('text-sm font-mono font-medium', blocked ? 'text-destructive' : 'text-status-active')}>
              {blocked ? 'BLOCKED' : triggered.length > 0 ? 'PASSED (with actions)' : 'PASSED'}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {triggered.length} of {results.length} rules triggered
            </span>
          </div>
          <div className="space-y-1.5">
            {results.map((r) => {
              const Icon = actionIcons[r.action] || Info;
              return (
                <div key={r.ruleId} className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-xs', r.triggered ? 'surface-elevated' : 'opacity-50')}>
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', r.triggered ? actionResultColors[r.action] : 'text-muted-foreground')} />
                  <span className="font-medium text-foreground min-w-[140px]">{r.ruleName}</span>
                  <Badge variant="outline" className="text-[10px] font-mono rounded-sm px-1.5">{r.action}</Badge>
                  <span className="text-muted-foreground font-mono ml-auto">{r.detail}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
