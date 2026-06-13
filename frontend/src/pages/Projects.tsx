import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderKanban, ChevronRight, Building2, Users, Plus, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createProject } from '@/lib/api';
import { toast } from 'sonner';

export default function Projects() {
  const { organization, projects, membership, refreshProjects } = useAuth();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
  };

  const createMutation = useMutation({
    mutationFn: () => createProject({
      name: name.trim(),
      description: description.trim(),
    }),
    onSuccess: async (project) => {
      await refreshProjects();
      reset();
      setCreateOpen(false);
      toast.success(`Project "${project.name}" created`);
      navigate(`/projects/${project.id}/policies`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleCreate = () => {
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-mono">{organization?.name}</h1>
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-1">
                <span>Organization</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Your role: <span className="text-foreground">{membership?.role}</span>
                </span>
              </div>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="font-mono text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Project
          </Button>
        </div>

        <div>
          <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3">
            Projects ({projects.length})
          </h2>

          {projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FolderKanban className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-mono text-muted-foreground">No projects yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first project to start managing guardrails.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  className="mt-4 font-mono text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="hover:border-primary/40 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/projects/${project.id}/policies`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FolderKanban className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base font-mono truncate">{project.name}</CardTitle>
                          <CardDescription className="text-xs mt-0.5 line-clamp-2">
                            {project.description || "AI workload protected by Netra guardrails"}
                          </CardDescription>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <span>{project.policySetsCount} policy set{project.policySetsCount !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span className="truncate">/{project.slug}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-6 mt-8">
          <p className="text-xs font-mono text-muted-foreground">
            Members, roles, and organization settings — coming soon.
          </p>
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) {
            reset();
            createMutation.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Name</Label>
              <Input
                placeholder="e.g. Marketing Copilot"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="font-mono text-sm"
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Description</Label>
              <Textarea
                placeholder="What does this project do?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="font-mono text-sm resize-none"
                rows={3}
                disabled={createMutation.isPending}
              />
            </div>
            {createMutation.isError && (
              <p className="text-sm text-destructive font-mono">
                {createMutation.error?.message || 'Failed to create project'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="font-mono text-xs"
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createMutation.isPending}
              className="font-mono text-xs gap-1.5"
            >
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
