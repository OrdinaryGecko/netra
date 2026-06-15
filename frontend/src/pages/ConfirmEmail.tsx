import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';
import { getOrgSlug } from '@/lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function ConfirmEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setError('Missing confirmation token.'); return; }

    const headers: Record<string, string> = { Accept: "application/json" };
    const orgSlug = getOrgSlug();
    if (orgSlug) headers["X-Netra-Org-Slug"] = orgSlug;

    fetch(`${API_BASE_URL}/v1/auth/confirmation?confirmation_token=${encodeURIComponent(token)}`, { headers })
      .then(async (res) => {
        if (res.ok) { setStatus('success'); }
        else {
          const data = await res.json().catch(() => null);
          setStatus('error');
          setError(data?.details?.join(', ') || 'Confirmation failed');
        }
      })
      .catch(() => { setStatus('error'); setError('Network error'); });
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold font-mono">Email Confirmation</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && <p className="text-sm text-muted-foreground font-mono">Confirming...</p>}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm font-mono">Your new email has been confirmed.</p>
              <Button onClick={() => navigate('/sign-in')} className="font-mono text-xs">Go to Sign In</Button>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm text-destructive font-mono">{error}</p>
              <Button variant="ghost" onClick={() => navigate('/sign-in')} className="font-mono text-xs">Go to Sign In</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
