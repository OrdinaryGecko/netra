import { PolicyVersion } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Rocket, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VersionHeaderProps {
  version: PolicyVersion;
  onPublish: () => void;
  onClone: () => void;
}

export function VersionHeader({ version, onPublish, onClone }: VersionHeaderProps) {
  const isDraft = version.status === 'draft';
  const navigate = useNavigate();

  return (
    <div className="border-b border-border bg-card px-6 py-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/policies')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => navigate('/policies')}
              className="flex items-center gap-3 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Go to homepage"
            >
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold font-mono tracking-tight text-foreground">
                {version.policySetName}
              </h1>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">v{version.version}</span>
            <StatusBadge status={version.status} />
            <span className="text-xs text-muted-foreground">
              Updated {new Date(version.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">{version.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
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
  );
}
