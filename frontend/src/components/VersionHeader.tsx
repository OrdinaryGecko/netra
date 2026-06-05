import { PolicyVersion } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Rocket, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { useCurrentProject } from '@/contexts/AuthContext';

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
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">v{version.version}</span>
              <StatusBadge status={version.status} />
              <span className="text-xs text-muted-foreground">
                Updated {new Date(version.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl">{version.description}</p>
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
