import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCurrentProject } from '@/contexts/AuthContext';
import { dryRunProject, fetchPolicySetsForProject } from '@/lib/api';
import { DryRunResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, CheckCircle2, XCircle, AlertTriangle, Info, ShieldCheck, ShieldAlert, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProjectDryRunPanelProps {
  projectId: string;
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
  mask: 'text-amber-600 dark:text-amber-400',
  log_only: 'text-muted-foreground',
};

function evaluationName(evaluation: DryRunResult['evaluations'][0]) {
  return evaluation.ruleName || evaluation.rule_name || "Rule";
}

function evaluationDetail(evaluation: DryRunResult['evaluations'][0]) {
  if (evaluation.detail) return evaluation.detail;
  if (evaluation.details) return JSON.stringify(evaluation.details);
  if (evaluation.outcome) return evaluation.outcome;

  return "No detail";
}

function evaluationTriggered(evaluation: DryRunResult['evaluations'][0]) {
  if (typeof evaluation.triggered === 'boolean') return evaluation.triggered;

  return evaluation.outcome === 'matched';
}

export function ProjectDryRunPanel({ projectId }: ProjectDryRunPanelProps) {
  const project = useCurrentProject(projectId);
  const [payload, setPayload] = useState('Hello, my email is john@example.com and my phone is 555-123-4567.');
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [environment, setEnvironment] = useState('development');

  const policySetsQuery = useQuery({
    queryKey: ['policy-sets', projectId, environment],
    queryFn: () => fetchPolicySetsForProject(projectId, environment),
  });

  const enabledSets = useMemo(
    () =>
      policySetsQuery.data?.filter(
        (ps) => ps.enabled
      ) || [],
    [policySetsQuery.data]
  );

  const dryRunMutation = useMutation({
    mutationFn: () => dryRunProject(projectId, payload, environment),
    onSuccess: (nextResult) => setResult(nextResult),
    onError: (error: Error) => toast.error(error.message),
  });

  const handleRun = () => {
    dryRunMutation.mutate();
  };

  const evaluations = result?.evaluations || [];
  const triggered = evaluations.filter(evaluationTriggered);
  const blocked = result?.status === 'blocked';
  const totalRules = evaluations.length;

  if (enabledSets.length === 0) {
    return (
      <div className="space-y-4">
        <Select value={environment} onValueChange={setEnvironment}>
          <SelectTrigger className="w-[160px] font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="development" className="font-mono text-xs">Development</SelectItem>
            <SelectItem value="staging" className="font-mono text-xs">Staging</SelectItem>
            <SelectItem value="production" className="font-mono text-xs">Production</SelectItem>
          </SelectContent>
        </Select>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground font-mono text-sm">
            No active, enabled policy sets for the <span className="font-semibold">{environment}</span> environment.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Select value={environment} onValueChange={setEnvironment}>
        <SelectTrigger className="w-[160px] font-mono text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="development" className="font-mono text-xs">Development</SelectItem>
          <SelectItem value="staging" className="font-mono text-xs">Staging</SelectItem>
          <SelectItem value="production" className="font-mono text-xs">Production</SelectItem>
        </SelectContent>
      </Select>
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FlaskConical className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-mono">Pipeline dry run</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Runs the payload through every enabled active set.
                Rules execute sorted by set priority, then rule priority.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {enabledSets.length} set{enabledSets.length !== 1 ? 's' : ''} · {totalRules} rule
              {totalRules !== 1 ? 's' : ''}
            </div>
            <Button size="sm" onClick={handleRun} disabled={dryRunMutation.isPending} className="font-mono text-xs">
              <Play className="h-3.5 w-3.5 mr-1.5" />
              {dryRunMutation.isPending ? 'Running...' : 'Run pipeline'}
            </Button>
          </div>
          <Textarea
            className="font-mono text-xs min-h-[120px]"
            placeholder="Paste a sample request payload..."
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                'rounded-md border px-4 py-3 flex items-center gap-2',
                blocked
                  ? 'border-destructive bg-destructive/5'
                  : 'border-status-active bg-status-active/5'
              )}
            >
              {blocked ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-status-active" />
              )}
              <span
                className={cn(
                  'text-sm font-mono font-medium',
                  blocked ? 'text-destructive' : 'text-status-active'
                )}
              >
                {blocked
                  ? 'BLOCKED'
                  : result.action === 'mask'
                  ? 'PASSED (with masking)'
                  : triggered.length > 0
                  ? 'PASSED (with actions)'
                  : 'PASSED'}
              </span>
              <span className="text-xs text-muted-foreground ml-auto font-mono">
                {triggered.length} of {totalRules} rules triggered
              </span>
            </div>

            <StageResults
              title="Input stage"
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              items={evaluations.filter((e) => e.stage === 'input')}
            />
            <StageResults
              title="Output stage"
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
              items={evaluations.filter((e) => e.stage === 'output')}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StageResults({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<DryRunResult['evaluations'][0]>;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-primary">{icon}</span>
        <h3 className="font-mono text-xs uppercase tracking-wider">{title}</h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {items.length} rule{items.length !== 1 ? 's' : ''}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="border rounded-md px-3 py-3 text-center font-mono text-xs text-muted-foreground">
          No rules contributed at this stage.
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((evaluation, index) => {
            const isTriggered = evaluationTriggered(evaluation);
            const Icon = isTriggered ? (actionIcons[evaluation.action] || Info) : CheckCircle2;
            return (
              <div
                key={`${evaluationName(evaluation)}-${index}`}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-xs border',
                  isTriggered ? 'bg-card' : 'opacity-60'
                )}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isTriggered ? actionResultColors[evaluation.action] : 'text-muted-foreground'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-foreground truncate">{evaluationName(evaluation)}</div>
                  {evaluation.policySetName && (
                    <div className="font-mono text-[10px] text-muted-foreground truncate">
                      from {evaluation.policySetName}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px] font-mono rounded-sm px-1.5 uppercase">
                  {isTriggered ? evaluation.action : 'pass'}
                </Badge>
                <span className="text-muted-foreground font-mono text-[11px] hidden md:block max-w-[260px] truncate">
                  {evaluationDetail(evaluation)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
