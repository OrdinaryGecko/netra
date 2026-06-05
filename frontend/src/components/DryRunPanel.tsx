import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { DryRunEvaluation, DryRunResult } from '@/lib/types';
import { dryRunPolicyVersion } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DryRunPanelProps {
  policyVersionId: string;
  projectId?: string;
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

const actionBadgeVariants: Record<string, "secondary" | "destructive" | "outline"> = {
  allow: 'secondary',
  block: 'destructive',
  mask: 'secondary',
  log_only: 'outline',
};

function evaluationName(evaluation: DryRunEvaluation) {
  return evaluation.ruleName || evaluation.rule_name || "Rule";
}

function evaluationDetail(evaluation: DryRunEvaluation) {
  if (evaluation.detail) return evaluation.detail;
  if (evaluation.details) return JSON.stringify(evaluation.details);
  if (evaluation.outcome) return evaluation.outcome;

  return "No detail";
}

function evaluationTriggered(evaluation: DryRunEvaluation) {
  if (typeof evaluation.triggered === 'boolean') return evaluation.triggered;

  return evaluation.outcome === 'matched';
}

export function DryRunPanel({ policyVersionId, projectId }: DryRunPanelProps) {
  const [payload, setPayload] = useState('Hello, my email is john@example.com and my phone is 555-123-4567.');
  const [result, setResult] = useState<DryRunResult | null>(null);
  const dryRunMutation = useMutation({
    mutationFn: () => dryRunPolicyVersion(policyVersionId, payload, projectId),
    onSuccess: (nextResult) => setResult(nextResult),
    onError: (error: Error) => toast.error(error.message),
  });

  const handleRun = () => {
    dryRunMutation.mutate();
  };

  const evaluations = result?.evaluations || [];
  const triggered = evaluations.filter(evaluationTriggered);
  const blocked = result?.status === 'blocked';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold font-mono text-foreground uppercase tracking-wider">Dry Run</h2>
        <Button size="sm" onClick={handleRun} disabled={dryRunMutation.isPending}>
          <Play className="h-3.5 w-3.5 mr-1.5" />
          {dryRunMutation.isPending ? 'Running...' : 'Run Test'}
        </Button>
      </div>
      <Textarea
        className="font-mono text-xs min-h-[100px]"
        placeholder="Paste a sample request payload..."
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
      />
      {result && (
        <div className="space-y-3">
          <div className={cn('rounded-md border px-4 py-3 flex items-center gap-2', blocked ? 'border-destructive bg-destructive/5' : 'border-status-active bg-status-active/5')}>
            {blocked ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-status-active" />}
            <span className={cn('text-sm font-mono font-medium', blocked ? 'text-destructive' : 'text-status-active')}>
              {blocked ? 'BLOCKED' : triggered.length > 0 ? 'PASSED (with actions)' : 'PASSED'}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {triggered.length} of {evaluations.length} rules triggered
            </span>
          </div>
          <div className="space-y-1.5">
            {evaluations.map((evaluation, index) => {
              const isTriggered = evaluationTriggered(evaluation);
              const Icon = isTriggered ? (actionIcons[evaluation.action] || Info) : CheckCircle2;
              return (
                <div key={`${evaluationName(evaluation)}-${index}`} className={cn('flex items-center gap-3 rounded-md border px-3 py-2 text-xs', isTriggered ? 'surface-elevated border-border' : 'border-status-active/30 bg-status-active/5')}>
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', isTriggered ? actionResultColors[evaluation.action] : 'text-status-active')} />
                  <span className="font-medium text-foreground min-w-[140px]">{evaluationName(evaluation)}</span>
                  <Badge variant={isTriggered ? actionBadgeVariants[evaluation.action] : 'secondary'} className="text-[10px] font-mono rounded-sm px-1.5">
                    {isTriggered ? evaluation.action : 'pass'}
                  </Badge>
                  <span className="text-muted-foreground font-mono ml-auto">{evaluationDetail(evaluation)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
