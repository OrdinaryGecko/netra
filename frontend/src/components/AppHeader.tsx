import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, LogOut, ChevronRight, Building2, FolderKanban } from 'lucide-react';
import { useAuth, usePermissions } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Project } from '@/lib/types';

interface AppHeaderProps {
  currentProject?: Project | null;
  trailing?: React.ReactNode;
}

export function AppHeader({ currentProject, trailing }: AppHeaderProps) {
  const { signOut, organization, user, projects } = useAuth();
  const { role } = usePermissions();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  return (
    <header className="border-b bg-card">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/projects" className="flex items-center gap-2 shrink-0 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-mono font-bold text-lg">Netra</span>
          </Link>

          {organization && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground ml-3 min-w-0">
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{organization.name}</span>
              {currentProject && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted text-foreground truncate">
                        <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{currentProject.name}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wider">
                        Switch project
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {projects.map((project) => (
                        <DropdownMenuItem
                          key={project.id}
                          onClick={() => navigate(`/projects/${project.id}/policies`)}
                          className="font-mono text-xs"
                        >
                          <FolderKanban className="h-3.5 w-3.5 mr-2" />
                          {project.name}
                          {project.id === currentProject.id && (
                            <span className="ml-auto text-primary">*</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/projects')} className="font-mono text-xs">
                        All projects
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {trailing}
          {user && (
            <span className="hidden sm:inline text-xs font-mono text-muted-foreground">
              {user.name}
            </span>
          )}
          {role && (
            <Badge variant="outline" className="hidden sm:inline-flex font-mono text-[10px] uppercase">
              {role}
            </Badge>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="font-mono text-xs gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
