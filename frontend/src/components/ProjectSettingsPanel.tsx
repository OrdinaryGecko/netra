import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { updateProject, fetchProviders, fetchProjectProviders, updateProjectProvider, addProjectProvider, fetchProviderModels } from '@/lib/api';
import { Project, Provider } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectSettingsPanelProps {
  project: Project;
}

export function ProjectSettingsPanel({ project }: ProjectSettingsPanelProps) {
  const { refreshProjects } = useAuth();
  const [name, setName] = useState(project.name);
  const [active, setActive] = useState(project.active);

  const providersQuery = useQuery({
    queryKey: ['providers'],
    queryFn: fetchProviders,
  });

  const projectProvidersQuery = useQuery({
    queryKey: ['project-providers', project.id],
    queryFn: () => fetchProjectProviders(project.id),
  });

  const projectMutation = useMutation({
    mutationFn: () => updateProject(project.id, {
      name: name.trim(),
      active,
    }),
    onSuccess: async () => {
      await refreshProjects();
      toast.success('Project settings saved');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [updatingEnv, setUpdatingEnv] = useState<string | null>(null);

  const changeProviderMutation = useMutation({
    mutationFn: ({ projectProviderId, providerId, env }: { projectProviderId?: string; providerId: string; env: string }) => {
      setUpdatingEnv(env);
      if (projectProviderId) {
        return updateProjectProvider(project.id, projectProviderId, { provider_id: providerId });
      }
      return addProjectProvider(project.id, { provider_id: providerId, is_default: true, environment: env });
    },
    onSuccess: async () => {
      await projectProvidersQuery.refetch();
      setUpdatingEnv(null);
      toast.success('Provider updated');
    },
    onError: (error: Error) => {
      setUpdatingEnv(null);
      toast.error(error.message);
    },
  });

  const updateModelMutation = useMutation({
    mutationFn: ({ projectProviderId, model }: { projectProviderId: string; model: string }) => {
      return updateProjectProvider(project.id, projectProviderId, { default_model: model || null });
    },
    onSuccess: async () => {
      await projectProvidersQuery.refetch();
      toast.success('Model updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dirty = name !== project.name || active !== project.active;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-mono">Project settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="font-mono text-xs" disabled={projectMutation.isPending} />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Project key</Label>
              <Input value={project.key} disabled className="font-mono text-xs opacity-60" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={active} onCheckedChange={setActive} disabled={projectMutation.isPending} />
              <Label className="font-mono text-xs">Project active</Label>
            </div>
          </div>
          <div className="pt-2">
            <Button onClick={() => projectMutation.mutate()} disabled={!dirty || !name.trim() || projectMutation.isPending} className="font-mono text-xs">
              {projectMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-mono">Project providers</CardTitle>
              <CardDescription className="text-xs">
                Choose the provider and optional model override for each runtime environment.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit rounded-md font-mono text-[10px] uppercase tracking-wider">
              {projectProvidersQuery.data?.length || 0}/3 configured
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-hidden rounded-lg border bg-background/60">
            {['development', 'staging', 'production'].map((env) => {
              const currentPp = projectProvidersQuery.data?.find((pp) => pp.environment === env);
              const currentProvider = providersQuery.data?.find((provider) => provider.id === currentPp?.providerId);
              const effectiveModel = currentPp?.defaultModel || currentProvider?.defaultModel || null;
              const usesProviderDefault = Boolean(currentPp && !currentPp.defaultModel && currentProvider?.defaultModel);

              return (
                <div
                  key={env}
                  className={cn(
                    "grid gap-3 border-b p-3 last:border-b-0 lg:grid-cols-[150px_minmax(220px,1fr)_minmax(220px,1fr)] lg:items-center",
                    currentPp ? "bg-card" : "bg-muted/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-3 lg:block lg:space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
                        {env}
                      </span>
                      {updatingEnv === env && (
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Saving</span>
                      )}
                    </div>
                    <Badge
                      variant={currentPp ? 'secondary' : 'outline'}
                      className="w-fit rounded-md font-mono text-[9px] uppercase tracking-wider"
                    >
                      {currentPp ? 'Configured' : 'Empty'}
                    </Badge>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <Label className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground lg:hidden">Provider</Label>
                    <ProviderPicker
                      providers={providersQuery.data || []}
                      value={currentPp?.providerId}
                      disabled={updatingEnv === env || providersQuery.isLoading}
                      onChange={(providerId) => {
                        if (!currentPp || providerId !== currentPp.providerId) {
                          changeProviderMutation.mutate({ projectProviderId: currentPp?.id, providerId, env });
                        }
                      }}
                    />
                    {currentPp && (
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {currentPp.providerType} / {currentPp.providerName}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <Label className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground lg:hidden">Model</Label>
                    {currentPp && currentPp.providerType !== 'stub' ? (
                      <>
                        <ModelPicker
                          providerId={currentPp.providerId}
                          value={currentPp.defaultModel || ''}
                          disabled={updateModelMutation.isPending}
                          onChange={(model) => updateModelMutation.mutate({ projectProviderId: currentPp.id, model })}
                        />
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {effectiveModel
                            ? `${usesProviderDefault ? 'Provider default' : 'Project override'}: ${effectiveModel}`
                            : 'Provider default will be used.'}
                        </p>
                      </>
                    ) : (
                      <div className="flex h-9 items-center rounded-md border border-dashed bg-muted/30 px-3 font-mono text-[10px] text-muted-foreground">
                        {currentPp ? 'No model required' : 'Select provider first'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ModelPicker({
  providerId,
  value,
  disabled,
  onChange,
}: {
  providerId: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const modelsQuery = useQuery({
    queryKey: ['provider-models', providerId],
    queryFn: () => fetchProviderModels(providerId),
    enabled: !!providerId && open,
  });

  const models = modelsQuery.data || [];
  const selected = models.find((m) => m.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background shrink-0",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "font-mono"
          )}
        >
          {selected ? (
            <span className="truncate">{selected.name}</span>
          ) : value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">Default model</span>
          )}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models..." className="h-8 font-mono text-xs" />
          <CommandEmpty className="font-mono text-xs py-2">
            {modelsQuery.isLoading ? 'Loading models...' : 'No models found.'}
          </CommandEmpty>
          <CommandGroup className="max-h-[250px] overflow-y-auto">
            {value && (
              <CommandItem
                value="use-provider-default"
                onSelect={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="flex items-center gap-2 py-2 cursor-pointer"
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0", !value ? "opacity-100" : "opacity-0")} />
                <span className="font-mono text-xs text-muted-foreground italic">Use provider default</span>
              </CommandItem>
            )}
            {models.map((m) => (
              <CommandItem
                key={m.id}
                value={`${m.name} ${m.id}`}
                onSelect={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className="flex items-center gap-2 py-2 cursor-pointer"
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0", value === m.id ? "opacity-100" : "opacity-0")} />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs font-medium">{m.name}</span>
                  {m.name !== m.id && (
                    <span className="font-mono text-[10px] text-muted-foreground ml-2">{m.id}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ProviderPicker({
  providers,
  value,
  disabled,
  onChange,
}: {
  providers: Provider[];
  value?: string;
  disabled?: boolean;
  onChange: (providerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = providers.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "font-mono"
          )}
        >
          {selected ? (
            <span className="truncate">{selected.name} / {selected.providerType}</span>
          ) : (
            <span className="text-muted-foreground">Select provider...</span>
          )}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search providers..." className="h-8 font-mono text-xs" />
          <CommandEmpty className="font-mono text-xs py-2">No providers found.</CommandEmpty>
          <CommandGroup>
            {providers.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.name} ${p.providerType} ${p.defaultModel || ''}`}
                onSelect={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
                className="flex items-start gap-3 py-2.5 cursor-pointer"
              >
                <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", value === p.id ? "opacity-100" : "opacity-0")} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium">{p.name}</span>
                    <span className="font-mono text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground uppercase">{p.providerType}</span>
                  </div>
                  {p.baseUrl && (
                    <p className="font-mono text-[10px] text-muted-foreground truncate">{p.baseUrl}</p>
                  )}
                  {p.defaultModel && (
                    <p className="font-mono text-[10px] text-muted-foreground">Model: {p.defaultModel}</p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
