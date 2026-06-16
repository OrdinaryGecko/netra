import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { PolicyVersion, Rule } from '@/lib/types';
import {
  clonePolicyVersion,
  createRule,
  deleteRule,
  fetchPolicyVersion,
  publishPolicyVersion,
  updateRule,
} from '@/lib/api';
import { VersionHeader } from './VersionHeader';
import { RulesTable } from './RulesTable';
import { RuleEditorDialog } from './RuleEditorDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function PolicyWorkspace() {
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneVersionName, setCloneVersionName] = useState('');
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>();

  const versionQuery = useQuery({
    queryKey: ['policy-version', projectId, versionId],
    queryFn: () => fetchPolicyVersion(versionId!, projectId),
    enabled: Boolean(versionId),
  });

  const version = versionQuery.data;
  const isDraft = version?.status === 'draft';

  const persistedRule = (rule: Rule) => version?.rules.some((existingRule) => existingRule.id === rule.id) ?? false;

  const refreshWorkspace = async () => {
    await queryClient.invalidateQueries({ queryKey: ['policy-sets', projectId] });
    await queryClient.invalidateQueries({ queryKey: ['policy-version'] });
  };

  const publishMutation = useMutation({
    mutationFn: (policyVersion: PolicyVersion) => publishPolicyVersion(policyVersion.id, projectId),
    onSuccess: async (policyVersion) => {
      navigate(`/projects/${projectId}/policy/${policyVersion.id}`, { replace: true });
      await refreshWorkspace();
      toast.success('Policy version published successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cloneMutation = useMutation({
    mutationFn: ({ policyVersion, versionName }: { policyVersion: PolicyVersion; versionName?: string }) =>
      clonePolicyVersion(policyVersion, projectId, versionName || undefined),
    onSuccess: async (policyVersion) => {
      navigate(`/projects/${projectId}/policy/${policyVersion.id}`);
      await refreshWorkspace();
      setCloneOpen(false);
      setCloneVersionName('');
      toast.success('New draft version created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveRuleMutation = useMutation({
    mutationFn: async (rule: Rule) => {
      if (persistedRule(rule)) return updateRule(rule, projectId);

      const { id: _id, ...ruleWithoutId } = rule;
      return createRule(versionId!, ruleWithoutId, projectId);
    },
    onSuccess: async (_savedRule, rule) => {
      await refreshWorkspace();
      setEditorOpen(false);
      setEditingRule(null);
      toast.success(persistedRule(rule) ? 'Rule updated' : 'Rule created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => deleteRule(ruleId, projectId),
    onSuccess: async () => {
      await refreshWorkspace();
      toast.success('Rule deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleAddRule = () => {
    setEditingRule(null);
    setEditorOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };

  const handlePublish = () => {
    setPublishConfirm(true);
  };

  const confirmPublish = () => {
    if (version) publishMutation.mutate(version);
    setPublishConfirm(false);
  };

  const handleClone = () => {
    if (!version) return;
    setCloneVersionName(`${version.version}-draft`);
    setCloneOpen(true);
  };

  const handleCloneConfirm = () => {
    if (version) cloneMutation.mutate({ policyVersion: version, versionName: cloneVersionName.trim() || undefined });
  };

  const handleToggleRule = (id: string) => {
    if (!version) return;

    const target = version.rules.find((rule) => rule.id === id);
    if (!target) return;

    saveRuleMutation.mutate({ ...target, enabled: !target.enabled });
  };

  const handleSaveRule = (rule: Rule) => {
    saveRuleMutation.mutate(rule);
  };

  const handleDeleteRule = (id: string) => {
    setDeleteRuleId(id);
  };

  const confirmDeleteRule = () => {
    if (deleteRuleId) deleteRuleMutation.mutate(deleteRuleId);
    setDeleteRuleId(null);
  };

  if (versionQuery.isLoading) {
    return <div className="min-h-screen bg-background px-6 py-10 text-sm text-muted-foreground">Loading policy workspace...</div>;
  }

  if (versionQuery.error instanceof Error && versionQuery.error.message.toLowerCase().includes('unauthorized')) {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-3 text-xl font-semibold">Admin session required</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            Sign in with an admin API key first, then return to the React app.
          </p>
          <Button asChild>
            <a href="/sign-in">Open admin sign-in</a>
          </Button>
        </div>
      </div>
    );
  }

  if (versionQuery.error instanceof Error) {
    return <div className="min-h-screen bg-background px-6 py-10 text-sm text-destructive">{versionQuery.error.message}</div>;
  }

  if (!version) {
    return <div className="min-h-screen bg-background px-6 py-10 text-sm text-muted-foreground">No policy versions available.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <VersionHeader version={version} onPublish={handlePublish} onClone={handleClone} />
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="space-y-6">
          <RulesTable
            rules={version.rules}
            isDraft={isDraft}
            onToggle={handleToggleRule}
            onEdit={handleEditRule}
            onDelete={handleDeleteRule}
            onAdd={handleAddRule}
          />
        </div>
      </div>
      <RuleEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveRule}
        rule={editingRule}
        readOnly={!isDraft}
      />
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Clone to new draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="font-mono text-xs uppercase tracking-wider">Version name</Label>
            <div className="flex items-center gap-0">
              <span className="font-mono text-sm text-muted-foreground px-2 py-1.5 border border-r-0 rounded-l-md bg-muted">v</span>
              <Input
                value={cloneVersionName}
                onChange={(e) => setCloneVersionName(e.target.value)}
                placeholder="e.g. 2, 2-safety, hotfix-1"
                className="font-mono text-sm rounded-l-none"
                disabled={cloneMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)} className="font-mono text-xs" disabled={cloneMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleCloneConfirm} disabled={cloneMutation.isPending} className="font-mono text-xs">
              {cloneMutation.isPending ? 'Cloning...' : 'Clone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteRuleId}
        onClose={() => setDeleteRuleId(null)}
        onConfirm={confirmDeleteRule}
        title="Delete rule"
        description="This rule will be permanently removed from this draft. This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
      <ConfirmDialog
        open={publishConfirm}
        onClose={() => setPublishConfirm(false)}
        onConfirm={confirmPublish}
        title="Publish version"
        description="Publishing will lock this version and make it active. The current active version will be archived. This cannot be undone."
        confirmLabel="Publish"
      />
    </div>
  );
}
