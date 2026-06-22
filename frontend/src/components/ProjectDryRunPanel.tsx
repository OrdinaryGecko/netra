import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentProject } from '@/contexts/AuthContext';
import { fetchPolicySetsForProject, fetchProjectProviders, fetchProviders } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare } from 'lucide-react';
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

  const providersQuery = useQuery({
    queryKey: ['providers'],
    queryFn: fetchProviders,
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

  const resolvedModel = useMemo(() => {
    if (defaultProvider?.defaultModel) return defaultProvider.defaultModel;
    if (defaultProvider?.providerId) {
      const parentProvider = providersQuery.data?.find((p) => p.id === defaultProvider.providerId);
      return parentProvider?.defaultModel || null;
    }
    return null;
  }, [defaultProvider, providersQuery.data]);

  if (enabledSets.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <DryRunHeader environment={environment} onEnvironmentChange={setEnvironment} />
          <CardContent className="py-12 text-center text-muted-foreground font-mono text-sm">
            No active, enabled policy sets for the <span className="font-semibold">{environment}</span> environment.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <DryRunHeader environment={environment} onEnvironmentChange={setEnvironment} />
        <CardContent>
          <DryRunChat
            projectId={projectId}
            environment={environment}
            providerName={defaultProvider?.providerName}
            providerType={defaultProvider?.providerType}
            defaultModel={resolvedModel}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DryRunHeader({
  environment,
  onEnvironmentChange,
}: {
  environment: string;
  onEnvironmentChange: (environment: string) => void;
}) {
  return (
    <CardHeader>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-mono">Dry run</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Test your guardrails in a conversational interface.
            </CardDescription>
          </div>
        </div>
        <Select value={environment} onValueChange={onEnvironmentChange}>
          <SelectTrigger className="w-full sm:w-[160px] font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="development" className="font-mono text-xs">Development</SelectItem>
            <SelectItem value="staging" className="font-mono text-xs">Staging</SelectItem>
            <SelectItem value="production" className="font-mono text-xs">Production</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardHeader>
  );
}
