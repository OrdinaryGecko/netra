import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Shield, Plus, LogOut, Search, FileText, ChevronRight, GitBranch } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createPolicySet, fetchPolicySets } from '@/lib/api';

export default function Policies() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newEnvironment, setNewEnvironment] = useState('development');

  const policySetsQuery = useQuery({
    queryKey: ['policy-sets'],
    queryFn: fetchPolicySets,
  });

  const createPolicyMutation = useMutation({
    mutationFn: () => createPolicySet({
      name: newName.trim(),
      description: newDesc.trim(),
      environment: newEnvironment.trim() || 'development',
    }),
    onSuccess: async ({ policyVersion }) => {
      await queryClient.invalidateQueries({ queryKey: ['policy-sets'] });
      setNewName('');
      setNewDesc('');
      setNewEnvironment('development');
      setCreateOpen(false);
      toast.success('Policy created with an initial draft version');
      navigate(`/policy/${policyVersion.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const items = policySetsQuery.data || [];
    return items.filter(
      (policy) =>
        policy.name.toLowerCase().includes(search.toLowerCase()) ||
        policy.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [policySetsQuery.data, search]);

  const openPolicyVersion = (versionId: string) => {
    navigate(`/policy/${versionId}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createPolicyMutation.mutate();
  };

  if (policySetsQuery.isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Loading policy sets...</div>;
  }

  if (policySetsQuery.error instanceof Error) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-destructive">{policySetsQuery.error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-mono font-bold text-lg">Netra</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="font-mono text-xs gap-1.5">
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono">Policy Sets</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your AI guardrail policies and their versions.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="font-mono text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Policy
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-mono text-xs"
          />
        </div>

        <div className="grid gap-4">
          {filtered.map((policy) => {
            return (
              <Card key={policy.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-mono">{policy.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{policy.description}</CardDescription>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground font-mono">
                      <div>{policy.policyVersions.length} version{policy.policyVersions.length !== 1 ? 's' : ''}</div>
                      <div>{policy.environment}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {policy.policyVersions.map((version) => (
                      <button
                        key={version.id}
                        type="button"
                        onClick={() => openPolicyVersion(version.id)}
                        className="w-full rounded-lg border border-border bg-background/70 px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-mono text-sm font-medium">{version.version}</span>
                              <StatusBadge status={version.status} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {version.description || 'No description'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono shrink-0">
                            <span>{version.rulesCount || 0} rules</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-mono text-sm">No policies found</p>
            </div>
          )}
        </div>
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
                onChange={(e) => setNewName(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Environment</Label>
              <Input
                placeholder="development"
                value={newEnvironment}
                onChange={(e) => setNewEnvironment(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Description</Label>
              <Textarea
                placeholder="What does this policy set cover?"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
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
    </div>
  );
}
