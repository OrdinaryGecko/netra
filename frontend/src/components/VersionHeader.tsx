import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PolicyVersion } from '@/lib/types';
import { updatePolicyVersion } from '@/lib/api';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy, Rocket, FileText, Pencil, Check, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { useCurrentProject } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface VersionHeaderProps {
  version: PolicyVersion;
  onPublish: () => void;
  onClone: () => void;
}

export function VersionHeader({ version, onPublish, onClone }: VersionHeaderProps) {
  const isDraft = version.status === 'draft';
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const project = useCurrentProject(projectId);
  const backTo = projectId ? `/projects/${projectId}/policies` : '/projects';
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editVersion, setEditVersion] = useState(version.version);
  const [editDesc, setEditDesc] = useState(version.description);

  const updateMutation = useMutation({
    mutationFn: () => updatePolicyVersion(version.id, {
      version: editVersion.trim() || version.version,
      definition: { description: editDesc.trim() },
    }, projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['policy-version'] });
      await queryClient.invalidateQueries({ queryKey: ['policy-sets', projectId] });
      setEditing(false);
      toast.success('Version updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startEditing = () => {
    setEditVersion(version.version);
    setEditDesc(version.description);
    setEditing(true);
  };

  return (
    <>
      <AppHeader currentProject={project} />
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => navigate(backTo)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <FileText className="h-4 w-4 text-primary" />
              <h1 className="text-lg font-semibold font-mono tracking-tight text-foreground truncate">
                {version.policySetName}
              </h1>
            </div>
            {editing ? (
              <div className="space-y-2 max-w-md">
                <div className="flex items-center gap-2">
                  <Input value={editVersion} onChange={(e) => setEditVersion(e.target.value)} className="font-mono text-xs h-7 w-32" placeholder="Version" />
                  <StatusBadge status={version.status} />
                </div>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="font-mono text-xs h-7" placeholder="Description" />
                <div className="flex items-center gap-1.5">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">v{version.version}</span>
                  <StatusBadge status={version.status} />
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(version.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {isDraft && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditing}>
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground max-w-xl">{version.description}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onClone}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Clone
            </Button>
            {isDraft && (
              <Button size="sm" onClick={onPublish}>
                <Rocket className="h-3.5 w-3.5 mr-1.5" />
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
