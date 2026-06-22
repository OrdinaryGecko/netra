import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchProviders, createProvider, updateProvider, deleteProvider, getProviderDefaults, fetchProviderModels, validateProvider } from '@/lib/api';
import { Provider } from '@/lib/types';
import { AppHeader } from '@/components/AppHeader';
import { MembersPanel } from '@/pages/Members';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Globe, Cpu, Lock, Check, ChevronsUpDown, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsSection = 'providers' | 'members';

const SETTINGS_SECTIONS: Array<{
  id: SettingsSection;
  label: string;
  icon: typeof Cpu;
}> = [
  {
    id: 'providers',
    label: 'Providers',
    icon: Cpu,
  },
  {
    id: 'members',
    label: 'Members',
    icon: Users,
  },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const requestedSection = searchParams.get('section');
  const activeSection: SettingsSection = requestedSection === 'members' ? 'members' : 'providers';

  const providersQuery = useQuery({
    queryKey: ['providers'],
    queryFn: fetchProviders,
  });

  const createMutation = useMutation({
    mutationFn: createProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setCreateOpen(false);
      toast.success('Provider created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...params }: { id: string } & Parameters<typeof updateProvider>[1]) =>
      updateProvider(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setEditingProvider(null);
      toast.success('Provider updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast.success('Provider deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold">Settings</h1>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <nav className="rounded-lg border bg-card p-1.5">
                {SETTINGS_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const active = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setSearchParams(section.id === 'providers' ? {} : { section: section.id })}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                        active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", active && "text-primary")} />
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-medium">{section.label}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            <div className="min-w-0">
              {activeSection === 'providers' ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Cpu className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-mono">Providers</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Configure AI providers for your projects
                          </p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setCreateOpen(true)} className="font-mono text-xs">
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Provider
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {providersQuery.data && providersQuery.data.length > 0 ? (
                      <div className="space-y-2">
                        {providersQuery.data.map((provider) => (
                          <ProviderCard
                            key={provider.id}
                            provider={provider}
                            onEdit={() => setEditingProvider(provider)}
                            onDelete={() => {
                              if (confirm(`Delete "${provider.name}"?`)) {
                                deleteMutation.mutate(provider.id);
                              }
                            }}
                            isDeleting={deleteMutation.isPending}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="font-mono text-sm">No providers configured</p>
                        <p className="font-mono text-xs mt-1">Add a provider to get started</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <MembersPanel showHeader={false} />
              )}
            </div>
          </div>
        </div>
      </main>

      <ProviderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      {editingProvider && (
        <ProviderDialog
          open={!!editingProvider}
          onOpenChange={(open) => !open && setEditingProvider(null)}
          provider={editingProvider}
          onSubmit={(data) => updateMutation.mutate({ id: editingProvider.id, ...data })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  onEdit,
  onDelete,
  isDeleting,
}: {
  provider: Provider;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-md border px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{provider.name}</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
            {provider.providerType}
          </span>
          {!provider.active && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
              Inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground font-mono">
          {provider.baseUrl && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {provider.baseUrl}
            </span>
          )}
          {provider.defaultModel && (
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {provider.defaultModel}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!provider.providerType.includes('stub') && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 px-2">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {!provider.providerType.includes('stub') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="h-8 px-2 text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ProviderDialog({
  open,
  onOpenChange,
  provider,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: Provider;
  onSubmit: (data: {
    name: string;
    provider_type: string;
    base_url?: string;
    api_key?: string;
    default_model?: string;
    active?: boolean;
  }) => void;
  isPending: boolean;
}) {
  const isEditing = !!provider;
  const isStub = provider?.providerType === 'stub';

  const [name, setName] = useState(provider?.name || '');
  const [providerType, setProviderType] = useState(provider?.providerType || 'openai');
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl || getProviderDefaults(provider?.providerType || 'openai').baseUrl);
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState(provider?.defaultModel || '');
  const [active, setActive] = useState(provider?.active ?? true);
  const [validated, setValidated] = useState(isEditing);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [validating, setValidating] = useState(false);

  // Original values for comparison (editing only)
  const originalBaseUrl = provider?.baseUrl || '';
  const originalProviderType = provider?.providerType || '';

  // Compute if credential fields changed from originals
  const hasChanges = isEditing && (
    providerType !== originalProviderType ||
    baseUrl !== originalBaseUrl ||
    apiKey.trim() !== ''
  );

  // Fetch models when editing (creds already saved)
  const existingModelsQuery = useQuery({
    queryKey: ['provider-models', provider?.id],
    queryFn: () => fetchProviderModels(provider!.id),
    enabled: isEditing && !isStub && open,
  });

  // Sync fetched models for editing (only when no changes and validated)
  useEffect(() => {
    if (isEditing && validated && existingModelsQuery.data && !hasChanges) {
      setModels(existingModelsQuery.data);
    }
  }, [isEditing, validated, existingModelsQuery.data, hasChanges]);

  const handleProviderTypeChange = (type: string) => {
    setProviderType(type);
    if (type !== 'stub') {
      const defaults = getProviderDefaults(type);
      setBaseUrl(defaults.baseUrl);
      setDefaultModel('');
    } else {
      setBaseUrl('');
      setDefaultModel('');
    }
    setValidated(false);
    setModels([]);
  };

  const handleBaseUrlChange = (value: string) => {
    setBaseUrl(value);
    // Check if reverted to original
    if (isEditing && value === originalBaseUrl && apiKey.trim() === '' && providerType === originalProviderType) {
      setValidated(true);
      setModels(existingModelsQuery.data || []);
    } else {
      setValidated(false);
      setModels([]);
    }
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    // Check if reverted to original (empty = keep current)
    if (isEditing && value.trim() === '' && baseUrl === originalBaseUrl && providerType === originalProviderType) {
      setValidated(true);
      setModels(existingModelsQuery.data || []);
    } else if (value.trim() === '' && !isEditing) {
      // New provider: empty api key can't be validated
      setValidated(false);
      setModels([]);
    } else {
      setValidated(false);
      setModels([]);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const result = await validateProvider({
        provider_type: providerType,
        base_url: baseUrl,
        api_key: apiKey.trim() || undefined,
        provider_id: isEditing ? provider?.id : undefined,
      });
      if (result.valid) {
        setValidated(true);
        setModels(result.models || []);
        toast.success('Connection validated successfully');
      } else {
        toast.error(result.error || 'Validation failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = () => {
    onSubmit({
      name,
      provider_type: providerType,
      base_url: baseUrl || undefined,
      api_key: apiKey || undefined,
      default_model: defaultModel || undefined,
      active,
    });
  };

  const canValidate = !isStub && name.trim() && baseUrl.trim() && (isEditing ? (apiKey.trim() !== '' || hasChanges) : apiKey.trim());
  const canSave = !isStub && name.trim() && validated && (isEditing ? true : apiKey.trim() !== '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-mono">
            {isEditing ? (isStub ? 'View Provider' : 'Edit Provider') : 'Add Provider'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 min-w-0">
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production OpenAI"
              className="font-mono text-xs min-w-0"
              disabled={isStub}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">Provider type</Label>
            <Select value={providerType} onValueChange={handleProviderTypeChange} disabled={isEditing}>
              <SelectTrigger className="font-mono text-xs min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai" className="font-mono text-xs">OpenAI</SelectItem>
                <SelectItem value="anthropic" className="font-mono text-xs">Anthropic</SelectItem>
                <SelectItem value="openrouter" className="font-mono text-xs">OpenRouter</SelectItem>
                <SelectItem value="groq" className="font-mono text-xs">Groq</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!isStub && (
            <>
              <div className="space-y-2 min-w-0">
                <Label className="font-mono text-xs uppercase tracking-wider">Base URL</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => handleBaseUrlChange(e.target.value)}
                  placeholder="Auto-filled based on provider type"
                  className="font-mono text-xs min-w-0"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label className="font-mono text-xs uppercase tracking-wider">API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={isEditing ? "Leave empty to keep current" : "Enter API key"}
                  className="font-mono text-xs min-w-0"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label className="font-mono text-xs uppercase tracking-wider">Default model</Label>
                {validated ? (
                  <ModelPicker
                    models={models}
                    value={defaultModel}
                    onChange={setDefaultModel}
                  />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Input
                          disabled
                          placeholder="Validate connection first"
                          className="font-mono text-xs pr-8"
                        />
                        <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="font-mono text-xs">
                      Validate the connection to load available models
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </>
          )}
          {isStub && (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground font-mono">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="h-3 w-3" />
                <span>Stub provider is pre-configured</span>
              </div>
              <p>The stub provider echoes input as output without calling any external API. Used for testing guardrails without incurring costs.</p>
            </div>
          )}
          {!isStub && (
            <div className="flex items-center gap-3">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label className="font-mono text-xs">Active</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-mono text-xs">
            {isStub ? 'Close' : 'Cancel'}
          </Button>
          {!isStub && (
            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={!canValidate || validating}
              className="font-mono text-xs"
            >
              {validating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Validating...
                </>
              ) : validated && !hasChanges ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Validated
                </>
              ) : (
                'Validate'
              )}
            </Button>
          )}
          {!isStub && (
            <Button
              onClick={handleSubmit}
              disabled={!canSave || isPending}
              className="font-mono text-xs"
            >
              {isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Add provider'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModelPicker({
  models,
  value,
  onChange,
}: {
  models: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = models.find((m) => m.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background overflow-hidden min-w-0",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "font-mono"
          )}
        >
          {selected ? (
            <span className="truncate">{selected.name} ({selected.id})</span>
          ) : value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">Select model...</span>
          )}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models..." className="h-8 font-mono text-xs" />
          <CommandEmpty className="font-mono text-xs py-2">No models found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
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
                  <span className="font-mono text-[10px] text-muted-foreground ml-2">{m.id}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
