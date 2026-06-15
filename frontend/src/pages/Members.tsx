import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, usePermissions } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { fetchMembers, inviteMember, updateMemberRole, removeMember, MemberResponse } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = ['owner', 'admin', 'editor', 'viewer', 'auditor'] as const;

export default function Members() {
  const { user } = useAuth();
  const { canManage } = usePermissions();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('viewer');

  const membersQuery = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteMember({ email: email.trim(), name: name.trim() || undefined, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setInviteOpen(false);
      setEmail('');
      setName('');
      setRole('viewer');
      toast.success('Member invited');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => updateMemberRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Role updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => removeMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member removed');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const members = membersQuery.data || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-mono">Members</h1>
              <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)} className="font-mono text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Invite Member
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono">Organization members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md divide-y">
              {members.map((member) => {
                const isSelf = String(member.id) === user?.id;
                return (
                  <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm truncate">{member.name}</div>
                      <div className="font-mono text-xs text-muted-foreground truncate">{member.email}</div>
                    </div>
                    {canManage && !isSelf ? (
                      <Select
                        value={member.role}
                        onValueChange={(newRole) => updateRoleMutation.mutate({ id: member.id, role: newRole })}
                      >
                        <SelectTrigger className="w-[120px] font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="font-mono text-xs">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {member.role}{isSelf ? ' (you)' : ''}
                      </Badge>
                    )}
                    {canManage && !isSelf && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeMutation.mutate(member.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Invite Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com" className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Name (optional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="font-mono text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="font-mono text-sm">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="font-mono text-xs">Cancel</Button>
            <Button onClick={() => inviteMutation.mutate()} disabled={!email.trim() || inviteMutation.isPending} className="font-mono text-xs">
              {inviteMutation.isPending ? 'Inviting...' : 'Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
