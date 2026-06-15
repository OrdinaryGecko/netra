import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
      toast.success('If an account exists, reset instructions have been sent to your email.');
      navigate('/sign-in');
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
          <CardDescription>Enter your email to receive a password reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="font-mono" autoFocus />
            </div>
            <Button type="submit" className="w-full font-mono" disabled={submitting || !email.trim()}>
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <Button variant="ghost" className="w-full font-mono text-xs" onClick={() => navigate('/sign-in')}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
