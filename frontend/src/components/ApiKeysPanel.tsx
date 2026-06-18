import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApiKeys, createApiKey, revokeApiKey, ApiKeyResponse } from '@/lib/api';
import { usePermissions } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from './ConfirmDialog';
import { KeyRound, Plus, Trash2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeysPanelProps {
  projectId: string;
}

export function ApiKeysPanel({ projectId }: ApiKeysPanelProps) {
  const { canManage } = usePermissions();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const keysQuery = useQuery({
    queryKey: ['api-keys', projectId],
    queryFn: () => fetchApiKeys(projectId),
  });

  const createMutation = useMutation({
    mutationFn: () => createApiKey(projectId, name.trim() || 'Runtime key'),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', projectId] });
      setName('');
      setCreateOpen(false);
      if (response.token) {
        setNewToken(response.token);
      }
      toast.success('API key created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: number) => revokeApiKey(projectId, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', projectId] });
      toast.success('API key revoked');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleCopy = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const keys = keysQuery.data || [];

  return (
    <div className="space-y-6">
      {newToken && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4 space-y-2">
            <p className="font-mono text-xs font-medium">New API key created — copy it now, it won't be shown again:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-background border rounded px-3 py-2 truncate">{newToken}</code>
              <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => setNewToken(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-mono">Runtime API keys</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Keys used by client applications to authenticate guardrail requests.
                </CardDescription>
              </div>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setCreateOpen(true)} className="font-mono text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New Key
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground font-mono text-sm">
              No API keys yet. Create one to start sending requests.
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate">{key.name}</span>
                      {!key.active && <Badge variant="outline" className="font-mono text-[10px]">Revoked</Badge>}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      {key.token_hint && <>{key.token_hint} · </>}Created {new Date(key.created_at).toLocaleDateString()}
                      {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  {canManage && key.active && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setRevokingId(key.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production key" className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="font-mono text-xs">Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="font-mono text-xs">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!revokingId}
        onClose={() => setRevokingId(null)}
        onConfirm={() => { if (revokingId) revokeMutation.mutate(revokingId); setRevokingId(null); }}
        title="Revoke API key"
        description="This key will be permanently deactivated. Any applications using it will stop working immediately."
        confirmLabel="Revoke"
        destructive
      />
    </div>
  );
}
