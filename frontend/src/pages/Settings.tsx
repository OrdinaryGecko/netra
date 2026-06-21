import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProviders, createProvider, updateProvider, deleteProvider, getProviderDefaults } from '@/lib/api';
import { Provider } from '@/lib/types';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Settings, Plus, Trash2, Pencil, Globe, Key, Cpu, Lock } from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

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
            <p className="text-sm text-muted-foreground mt-1">Manage organization settings and integrations</p>
          </div>

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
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl || '');
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState(provider?.defaultModel || '');
  const [active, setActive] = useState(provider?.active ?? true);

  const handleProviderTypeChange = (type: string) => {
    setProviderType(type);
    if (type !== 'stub') {
      const defaults = getProviderDefaults(type);
      setBaseUrl(defaults.baseUrl);
      setDefaultModel(defaults.defaultModel);
    } else {
      setBaseUrl('');
      setDefaultModel('');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-mono">
            {isEditing ? (isStub ? 'View Provider' : 'Edit Provider') : 'Add Provider'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production OpenAI"
              className="font-mono text-xs"
              disabled={isStub}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">Provider type</Label>
            <Select value={providerType} onValueChange={handleProviderTypeChange} disabled={isEditing}>
              <SelectTrigger className="font-mono text-xs">
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
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Base URL</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="Auto-filled based on provider type"
                  className="font-mono text-xs"
                  disabled={isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={isEditing ? "Leave empty to keep current" : "Enter API key"}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Default model</Label>
                <Input
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  placeholder="e.g. gpt-4o"
                  className="font-mono text-xs"
                />
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
              onClick={handleSubmit}
              disabled={!name.trim() || isPending}
              className="font-mono text-xs"
            >
              {isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Create provider'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
