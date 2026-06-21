import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentProject } from '@/contexts/AuthContext';
import { fetchPolicySetsForProject, fetchProjectProviders } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Cpu, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DryRunChat } from './DryRunChat';

interface ProjectDryRunPanelProps {
  projectId: string;
}

export function ProjectDryRunPanel({ projectId }: ProjectDryRunPanelProps) {
  const project = useCurrentProject(projectId);
  const [environment, setEnvironment] = useState('development');

  const policySetsQuery = useQuery({
    queryKey: ['policy-sets', projectId, environment],
    queryFn: () => fetchPolicySetsForProject(projectId, environment),
  });

  const projectProvidersQuery = useQuery({
    queryKey: ['project-providers', projectId],
    queryFn: () => fetchProjectProviders(projectId),
  });

  const enabledSets = useMemo(
    () =>
      policySetsQuery.data?.filter(
        (ps) => ps.enabled
      ) || [],
    [policySetsQuery.data]
  );

  const defaultProvider = useMemo(
    () => projectProvidersQuery.data?.find((pp) => pp.isDefault && pp.environment === environment),
    [projectProvidersQuery.data, environment]
  );

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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
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
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-mono">Dry run</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Test your guardrails in a conversational interface.
                Each message is evaluated against your policies.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DryRunChat
            projectId={projectId}
            environment={environment}
            providerName={defaultProvider?.providerName}
            providerType={defaultProvider?.providerType}
            defaultModel={defaultProvider?.defaultModel}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderBadge({
  providerName,
  providerType,
  defaultModel,
  environment,
}: {
  providerName?: string;
  providerType?: string;
  defaultModel?: string | null;
  environment: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground cursor-default">
            <Cpu className="h-3 w-3" />
            {providerType ? (
              <span>
                <span className="font-medium text-foreground">{providerName || providerType}</span>
                {defaultModel && <span> / {defaultModel}</span>}
              </span>
            ) : (
              <span>No provider</span>
            )}
            <Info className="h-3 w-3 opacity-50" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-xs max-w-[250px]">
          {providerType
            ? `Using ${providerName || providerType} for the ${environment} environment. Change provider in project settings.`
            : `No provider set for the ${environment} environment. Set one in project settings.`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
