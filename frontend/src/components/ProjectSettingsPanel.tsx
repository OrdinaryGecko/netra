import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { updateProject } from '@/lib/api';
import { Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

interface ProjectSettingsPanelProps {
  project: Project;
}

export function ProjectSettingsPanel({ project }: ProjectSettingsPanelProps) {
  const { refreshProjects } = useAuth();
  const [name, setName] = useState(project.name);
  const [upstreamProvider, setUpstreamProvider] = useState(project.upstreamProvider || 'stub');
  const [upstreamBaseUrl, setUpstreamBaseUrl] = useState(project.upstreamBaseUrl || '');
  const [upstreamKey, setUpstreamKey] = useState('');
  const [defaultModel, setDefaultModel] = useState(project.defaultModel || '');
  const [active, setActive] = useState(project.active);

  const mutation = useMutation({
    mutationFn: () => updateProject(project.id, {
      name: name.trim(),
      upstream_provider: upstreamProvider,
      upstream_base_url: upstreamBaseUrl || null,
      upstream_key: upstreamKey || undefined,
      default_model: defaultModel || null,
      active,
    }),
    onSuccess: async () => {
      await refreshProjects();
      setUpstreamKey('');
      toast.success('Project settings saved');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dirty = name !== project.name
    || upstreamProvider !== (project.upstreamProvider || 'stub')
    || upstreamBaseUrl !== (project.upstreamBaseUrl || '')
    || upstreamKey !== ''
    || defaultModel !== (project.defaultModel || '')
    || active !== project.active;

  return (
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
            <Input value={name} onChange={(e) => setName(e.target.value)} className="font-mono text-xs" disabled={mutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Project key</Label>
            <Input value={project.key} disabled className="font-mono text-xs opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Upstream provider</Label>
            <Select value={upstreamProvider} onValueChange={setUpstreamProvider} disabled={mutation.isPending}>
              <SelectTrigger className="font-mono text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stub" className="font-mono text-xs">Stub (testing)</SelectItem>
                <SelectItem value="openai" className="font-mono text-xs">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Upstream base URL</Label>
            <Input value={upstreamBaseUrl} onChange={(e) => setUpstreamBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" className="font-mono text-xs" disabled={mutation.isPending} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Provider API key</Label>
            <Input type="password" value={upstreamKey} onChange={(e) => setUpstreamKey(e.target.value)} placeholder="sk-... (leave empty to keep current)" className="font-mono text-xs" disabled={mutation.isPending} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Default model</Label>
            <Input value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} placeholder="gpt-4o" className="font-mono text-xs" disabled={mutation.isPending} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={active} onCheckedChange={setActive} disabled={mutation.isPending} />
            <Label className="font-mono text-xs">Project active</Label>
          </div>
        </div>
        <div className="pt-2">
          <Button onClick={() => mutation.mutate()} disabled={!dirty || !name.trim() || mutation.isPending} className="font-mono text-xs">
            {mutation.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
