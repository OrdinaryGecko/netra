import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { updateProfile, updatePassword } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const profileMutation = useMutation({
    mutationFn: () => updateProfile({ name: name.trim(), email: email.trim() }),
    onSuccess: () => {
      updateUser({ name: name.trim(), email: email.trim() });
      toast.success('Profile updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const passwordMutation = useMutation({
    mutationFn: () => updatePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handlePasswordSubmit = () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    passwordMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold font-mono">Profile</h1>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-mono">Account details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
            <Button
              onClick={() => profileMutation.mutate()}
              disabled={profileMutation.isPending || (!name.trim() && !email.trim())}
              className="font-mono text-xs"
            >
              {profileMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-mono">Change password</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Current password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">New password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Confirm new password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
            <Button
              onClick={handlePasswordSubmit}
              disabled={passwordMutation.isPending || !currentPassword || !newPassword}
              className="font-mono text-xs"
            >
              {passwordMutation.isPending ? 'Updating...' : 'Update password'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
