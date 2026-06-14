import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      toast.success('If an account exists, a reset token has been generated. Check server logs in development.');
      setStep('reset');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await resetPassword(token.trim(), newPassword);
      toast.success('Password reset! You can now sign in.');
      navigate('/sign-in');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold font-mono">Reset Password</CardTitle>
          <CardDescription>
            {step === 'email' ? 'Enter your email to receive a reset token.' : 'Enter the reset token and your new password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="font-mono" autoFocus />
              </div>
              <Button type="submit" className="w-full font-mono" disabled={submitting || !email.trim()}>
                {submitting ? 'Sending...' : 'Send Reset Token'}
              </Button>
              <Button variant="ghost" className="w-full font-mono text-xs" onClick={() => navigate('/sign-in')}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back to Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Reset Token</Label>
                <Input value={token} onChange={(e) => { setToken(e.target.value); setError(''); }} placeholder="Paste token from email/logs" className="font-mono" autoFocus />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(''); }} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }} className="font-mono" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full font-mono" disabled={submitting || !token.trim() || !newPassword}>
                {submitting ? 'Resetting...' : 'Reset Password'}
              </Button>
              <Button variant="ghost" className="w-full font-mono text-xs" onClick={() => setStep('email')}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
