import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useCurrentProject } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Search, FileText, ChevronRight, FolderKanban, ChevronDown, Plug, ListTree, Workflow, FlaskConical, Settings, Pencil } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntegrationPanel } from '@/components/IntegrationPanel';
import { PipelinePanel } from '@/components/PipelinePanel';
import { ProjectDryRunPanel } from '@/components/ProjectDryRunPanel';
import { createPolicySet, fetchPolicySetsForProject, updatePolicySet } from '@/lib/api';
import { ProjectSettingsPanel } from '@/components/ProjectSettingsPanel';
import { PolicySetSummary } from '@/lib/types';

export default function Policies() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useCurrentProject(projectId);
  const { projects } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [envFilter, setEnvFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newEnv, setNewEnv] = useState('development');
  const [editingSet, setEditingSet] = useState<PolicySetSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editEnv, setEditEnv] = useState('development');
  const [editPriority, setEditPriority] = useState(100);
  const [editEnabled, setEditEnabled] = useState(true);

  const policySetsQuery = useQuery({
    queryKey: ['policy-sets', projectId, envFilter],
    queryFn: () => fetchPolicySetsForProject(projectId!, envFilter === 'all' ? undefined : envFilter),
    enabled: Boolean(projectId && project),
  });

  const createPolicyMutation = useMutation({
    mutationFn: () => createPolicySet({
      name: newName.trim(),
      description: newDesc.trim(),
      environment: newEnv,
      projectId,
    }),
    onSuccess: async ({ policyVersion }) => {
      await queryClient.invalidateQueries({ queryKey: ['policy-sets', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewName('');
      setNewDesc('');
      setNewEnv('development');
      setCreateOpen(false);
      toast.success('Policy created with an initial draft version');
      navigate(`/projects/${projectId}/policy/${policyVersion.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateSetMutation = useMutation({
    mutationFn: () => updatePolicySet(editingSet!.id, {
      name: editName.trim(),
      environment: editEnv,
      priority: editPriority,
      enabled: editEnabled,
    }, projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['policy-sets', projectId] });
      setEditingSet(null);
      toast.success('Policy set updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openEditSet = (policy: PolicySetSummary) => {
    setEditingSet(policy);
    setEditName(policy.name);
    setEditEnv(policy.environment);
    setEditPriority(policy.priority);
    setEditEnabled(policy.enabled);
  };

  const filtered = useMemo(() => {
    const items = policySetsQuery.data || [];
    return items.filter(
      (policy) =>
        policy.name.toLowerCase().includes(search.toLowerCase()) ||
        policy.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [policySetsQuery.data, search]);

  const latestVersion = (policy: typeof filtered[number]) =>
    policy.policyVersions[0];
  const activeVersion = (policy: typeof filtered[number]) =>
    policy.policyVersions.find((version) => version.status === 'active');

  const handleCreate = () => {
    if (!newName.trim()) return;
    createPolicyMutation.mutate();
  };

  if (!projectId) return <Navigate to="/projects" replace />;
  if (projects.length > 0 && !project) return <Navigate to="/projects" replace />;

  if (policySetsQuery.isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Loading policies...</div>;
  }

  if (policySetsQuery.error instanceof Error) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-destructive">{policySetsQuery.error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentProject={project} />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-mono truncate">{project?.name}</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Policy sets scoped to this project.
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="font-mono text-xs gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" />
            New Policy
          </Button>
        </div>

        <Tabs defaultValue="sets" className="w-full">
          <TabsList className="font-mono text-xs">
            <TabsTrigger value="sets" className="gap-1.5">
              <ListTree className="h-3.5 w-3.5" />
              Policy Sets
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5">
              <Workflow className="h-3.5 w-3.5" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="dryrun" className="gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" />
              Dry Run
            </TabsTrigger>
            <TabsTrigger value="integration" className="gap-1.5">
              <Plug className="h-3.5 w-3.5" />
              Integration
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sets" className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9 font-mono text-xs"
                />
              </div>
              <Select value={envFilter} onValueChange={setEnvFilter}>
                <SelectTrigger className="w-[160px] font-mono text-xs">
                  <SelectValue placeholder="Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-mono text-xs">All environments</SelectItem>
                  <SelectItem value="development" className="font-mono text-xs">Development</SelectItem>
                  <SelectItem value="staging" className="font-mono text-xs">Staging</SelectItem>
                  <SelectItem value="production" className="font-mono text-xs">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4">
              {filtered.map((policy) => {
                const latest = latestVersion(policy);
                const active = activeVersion(policy);
                if (!latest) return null;
                const sortedVersions = [...policy.policyVersions].sort((a, b) => {
                  const av = parseInt(a.version, 10) || 0;
                  const bv = parseInt(b.version, 10) || 0;
                  return bv - av;
                });

                return (
                  <Card
                    key={policy.id}
                    className="hover:border-primary/40 transition-colors group"
                  >
                    <CardHeader
                      className="pb-3 cursor-pointer"
                      onClick={() => navigate(`/projects/${projectId}/policy/${latest.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base font-mono truncate">{policy.name}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">{policy.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); openEditSet(policy); }}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono flex-wrap">
                        <span>{policy.policyVersions.length} version{policy.policyVersions.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        {active && active.id === latest.id ? (
                          <span className="flex items-center gap-1.5">
                            Active & Latest: <StatusBadge status="active" /> v{active.version}
                          </span>
                        ) : active ? (
                          <>
                            <span className="flex items-center gap-1.5">
                              Active: <StatusBadge status="active" /> v{active.version}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1.5">
                              Latest: <StatusBadge status={latest.status} /> v{latest.version}
                            </span>
                          </>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            Latest: <StatusBadge status={latest.status} /> v{latest.version}
                          </span>
                        )}
                        <span>·</span>
                        <span>{latest.rulesCount || 0} rule{latest.rulesCount !== 1 ? 's' : ''}</span>
                        {!policy.enabled && (
                          <>
                            <span>·</span>
                            <span className="text-amber-600 dark:text-amber-400">Paused for project</span>
                          </>
                        )}
                      </div>

                      {sortedVersions.length > 1 && (
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="font-mono text-xs gap-1.5 h-7 px-2 -ml-2 text-muted-foreground hover:text-foreground"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                              View versions
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
                              {sortedVersions.map((version) => (
                                <button
                                  key={version.id}
                                  onClick={() => navigate(`/projects/${projectId}/policy/${version.id}`)}
                                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="font-mono text-xs text-foreground">v{version.version}</span>
                                    <StatusBadge status={version.status} />
                                    <span className="text-xs font-mono text-muted-foreground">
                                      {version.rulesCount || 0} rule{version.rulesCount !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                                    {version.updatedAt
                                      ? new Date(version.updatedAt).toLocaleDateString('en-US', {
                                          month: 'short', day: 'numeric', year: 'numeric',
                                        })
                                      : '—'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="font-mono text-sm">No policies in this project yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pipeline" className="mt-6">
            {projectId && <PipelinePanel projectId={projectId} />}
          </TabsContent>

          <TabsContent value="dryrun" className="mt-6">
            {projectId && <ProjectDryRunPanel projectId={projectId} />}
          </TabsContent>

          <TabsContent value="integration" className="mt-6">
            {project && <IntegrationPanel project={project} />}
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            {project && <ProjectSettingsPanel project={project} />}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Create Policy Set</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Name</Label>
              <Input
                placeholder="e.g. Production Safety Policy"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Environment</Label>
              <Select value={newEnv} onValueChange={setNewEnv}>
                <SelectTrigger className="font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development" className="font-mono text-sm">Development</SelectItem>
                  <SelectItem value="staging" className="font-mono text-sm">Staging</SelectItem>
                  <SelectItem value="production" className="font-mono text-sm">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Description</Label>
              <Textarea
                placeholder="What does this policy set cover?"
                value={newDesc}
                onChange={(event) => setNewDesc(event.target.value)}
                className="font-mono text-sm resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="font-mono text-xs">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createPolicyMutation.isPending} className="font-mono text-xs">
              {createPolicyMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSet} onOpenChange={(o) => { if (!o) setEditingSet(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Edit Policy Set</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="font-mono text-sm" disabled={updateSetMutation.isPending} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Environment</Label>
                <Select value={editEnv} onValueChange={setEditEnv} disabled={updateSetMutation.isPending}>
                  <SelectTrigger className="font-mono text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development" className="font-mono text-sm">Development</SelectItem>
                    <SelectItem value="staging" className="font-mono text-sm">Staging</SelectItem>
                    <SelectItem value="production" className="font-mono text-sm">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Priority</Label>
                <Input type="number" min={1} value={editPriority} onChange={(e) => setEditPriority(parseInt(e.target.value) || 100)} className="font-mono text-sm" disabled={updateSetMutation.isPending} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editEnabled} onCheckedChange={setEditEnabled} disabled={updateSetMutation.isPending} />
              <Label className="font-mono text-xs">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSet(null)} className="font-mono text-xs" disabled={updateSetMutation.isPending}>Cancel</Button>
            <Button onClick={() => updateSetMutation.mutate()} disabled={!editName.trim() || updateSetMutation.isPending} className="font-mono text-xs">
              {updateSetMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
