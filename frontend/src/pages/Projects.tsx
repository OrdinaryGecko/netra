import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderKanban, ChevronRight, Building2, Users, Plus } from 'lucide-react';

const envColor: Record<string, string> = {
  production: 'bg-primary/10 text-primary border-primary/30',
  staging: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
  development: 'bg-muted text-muted-foreground border-border',
};

export default function Projects() {
  const { organization, projects, membership } = useAuth();
  const navigate = useNavigate();

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
          <Button className="font-mono text-xs gap-1.5" disabled>
            <Plus className="h-3.5 w-3.5" />
            New Project
          </Button>
        </div>

        <div>
          <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-3">
            Projects ({projects.length})
          </h2>

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
                          {project.description}
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <Badge variant="outline" className={`font-mono text-[10px] uppercase ${envColor[project.environment]}`}>
                      {project.environment}
                    </Badge>
                    <span>·</span>
                    <span>{project.policySetsCount} policy set{project.policySetsCount !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span className="truncate">/{project.slug}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="border-t pt-6 mt-8">
          <p className="text-xs font-mono text-muted-foreground">
            Members, roles, and organization settings
          </p>
        </div>
      </div>
    </div>
  );
}
