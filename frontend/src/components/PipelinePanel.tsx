import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, ArrowRight, Workflow, ShieldCheck, ShieldAlert } from 'lucide-react';
import { PolicySetSummary, PolicyVersionSummary, RuleAction } from '@/lib/types';
import { fetchPolicySetsForProject, togglePolicySetEnabled } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PipelinePanelProps {
  projectId: string;
}

const actionStyles: Record<RuleAction, string> = {
  block: 'bg-destructive/10 text-destructive border-destructive/30',
  mask: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
  log_only: 'bg-muted text-muted-foreground border-border',
  allow: 'bg-primary/10 text-primary border-primary/30',
};

interface PipelineStep {
  set: PolicySetSummary;
  activeVersion: PolicyVersionSummary;
  rulesCount: number;
}

function flattenRules(
  steps: PipelineStep[],
  stage: 'input' | 'output'
): Array<{ set: PolicySetSummary; version: PolicyVersionSummary; rulesCount: number }> {
  return steps
    .filter((s) => s.activeVersion.status === 'active')
    .sort((a, b) => a.set.priority - b.set.priority);
}

export function PipelinePanel({ projectId }: PipelinePanelProps) {
  const queryClient = useQueryClient();
  const [environment, setEnvironment] = useState('development');

  const policySetsQuery = useQuery({
    queryKey: ['policy-sets', projectId, environment],
    queryFn: () => fetchPolicySetsForProject(projectId, environment),
    enabled: Boolean(projectId),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ policySetId, enabled }: { policySetId: string; enabled: boolean }) =>
      togglePolicySetEnabled(policySetId, enabled, projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['policy-sets', projectId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const steps = useMemo<PipelineStep[]>(() => {
    const items = policySetsQuery.data || [];
    return items
      .map((ps) => {
        const active = ps.policyVersions.find((v) => v.status === 'active');
        return active
          ? { set: ps, activeVersion: active, rulesCount: active.rulesCount || 0 }
          : null;
      })
      .filter((x): x is PipelineStep => x !== null)
      .sort((a, b) => a.set.priority - b.set.priority);
  }, [policySetsQuery.data]);

  const enabledSteps = steps.filter((s) => s.set.enabled);
  const disabledSteps = steps.filter((s) => !s.set.enabled);

  if (policySetsQuery.isLoading) {
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
            Loading pipeline...
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

      {steps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground font-mono text-sm">
            No active policy sets for the <span className="font-semibold">{environment}</span> environment.
          </CardContent>
        </Card>
      ) : (
      <>
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Workflow className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-mono">Runtime pipeline</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Policy sets applied to requests in the {environment} environment, sorted by priority.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-primary"><ShieldCheck className="h-4 w-4" /></span>
              <h3 className="font-mono text-xs uppercase tracking-wider">Policy sets</h3>
              <span className="font-mono text-[10px] text-muted-foreground">
                {enabledSteps.length} active
              </span>
            </div>
            {enabledSteps.length === 0 ? (
              <div className="border rounded-md px-3 py-4 text-center font-mono text-xs text-muted-foreground">
                No enabled policy sets. Toggle one on below.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 items-center">
                {enabledSteps.map(({ set, activeVersion }, i) => (
                  <div key={set.id} className="flex items-center gap-2">
                    <div className="border rounded-md px-2.5 py-1.5 bg-card min-w-0">
                      <div className="font-mono text-xs truncate">{set.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {activeVersion.status}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground truncate">
                          v{activeVersion.version}
                        </span>
                      </div>
                    </div>
                    {i < enabledSteps.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground border rounded-full px-3 py-1">
              <ArrowDown className="h-3 w-3" />
              Upstream provider call
              <ArrowDown className="h-3 w-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-primary"><ShieldAlert className="h-4 w-4" /></span>
              <h3 className="font-mono text-xs uppercase tracking-wider">After response</h3>
              <span className="font-mono text-[10px] text-muted-foreground">
                Output rules applied on provider response
              </span>
            </div>
            <div className="border rounded-md px-3 py-4 text-center font-mono text-xs text-muted-foreground">
              Output rules are evaluated per policy set on the upstream response.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">Contributing policy sets</CardTitle>
          <CardDescription className="text-xs">
            Toggle a set to pause it for this project without archiving its active version.
            Lower priority numbers run first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md divide-y">
            {steps.map(({ set, activeVersion }) => (
              <div key={set.id} className="flex items-center gap-3 px-3 py-2.5">
                <Switch
                  checked={set.enabled}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ policySetId: set.id, enabled: checked })
                  }
                  disabled={toggleMutation.isPending}
                  aria-label={`Toggle ${set.name}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="truncate">{set.name}</span>
                    <StatusBadge status={activeVersion.status} />
                    <span className="text-muted-foreground">v{activeVersion.version}</span>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                    {activeVersion.rulesCount || 0} enabled rule
                    {(activeVersion.rulesCount || 0) !== 1 ? 's' : ''} · priority {set.priority}
                  </div>
                </div>
                {!set.enabled && (
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">
                    Paused
                  </Badge>
                )}
              </div>
            ))}
          </div>
          {disabledSteps.length > 0 && (
            <p className="text-xs font-mono text-muted-foreground mt-3">
              {disabledSteps.length} paused set{disabledSteps.length !== 1 ? 's' : ''} excluded from the pipeline.
            </p>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
