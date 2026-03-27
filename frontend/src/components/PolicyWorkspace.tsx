import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PolicyVersion, Rule } from '@/lib/types';
import {
  clonePolicyVersion,
  createRule,
  deleteRule,
  fetchPolicySets,
  fetchPolicyVersion,
  publishPolicyVersion,
  updateRule,
} from '@/lib/api';
import { VersionHeader } from './VersionHeader';
import { RulesTable } from './RulesTable';
import { RuleEditorDialog } from './RuleEditorDialog';
import { DryRunPanel } from './DryRunPanel';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export function PolicyWorkspace() {
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const policySetsQuery = useQuery({
    queryKey: ['policy-sets'],
    queryFn: fetchPolicySets,
  });

  const selectedPolicySet = policySetsQuery.data?.find((policySet) =>
    policySet.policyVersions.some((version) => version.id === selectedVersionId),
  ) || policySetsQuery.data?.[0];

  useEffect(() => {
    if (selectedVersionId || !policySetsQuery.data?.length) return;

    const policySet = policySetsQuery.data[0];
    const preferredVersion =
      policySet.policyVersions.find((version) => version.status === 'draft') ||
      policySet.policyVersions.find((version) => version.status === 'active') ||
      policySet.policyVersions[0];

    if (preferredVersion) setSelectedVersionId(preferredVersion.id);
  }, [policySetsQuery.data, selectedVersionId]);

  const versionQuery = useQuery({
    queryKey: ['policy-version', selectedVersionId],
    queryFn: () => fetchPolicyVersion(selectedVersionId!, selectedPolicySet?.name || 'Policy'),
    enabled: Boolean(selectedVersionId && selectedPolicySet),
  });

  const version = versionQuery.data;
  const isDraft = version?.status === 'draft';

  const refreshWorkspace = async () => {
    await queryClient.invalidateQueries({ queryKey: ['policy-sets'] });
    await queryClient.invalidateQueries({ queryKey: ['policy-version'] });
  };

  const publishMutation = useMutation({
    mutationFn: (policyVersion: PolicyVersion) => publishPolicyVersion(policyVersion.id, policyVersion.policySetName),
    onSuccess: async (policyVersion) => {
      setSelectedVersionId(policyVersion.id);
      await refreshWorkspace();
      toast.success('Policy version published successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cloneMutation = useMutation({
    mutationFn: (policyVersion: PolicyVersion) => clonePolicyVersion(policyVersion),
    onSuccess: async (policyVersion) => {
      setSelectedVersionId(policyVersion.id);
      await refreshWorkspace();
      toast.success('New draft version created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveRuleMutation = useMutation({
    mutationFn: async (rule: Rule) => {
      if (editingRule) return updateRule(rule);

      const { id: _id, ...ruleWithoutId } = rule;
      return createRule(selectedVersionId!, ruleWithoutId);
    },
    onSuccess: async () => {
      await refreshWorkspace();
      setEditorOpen(false);
      setEditingRule(null);
      toast.success(editingRule ? 'Rule updated' : 'Rule created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => deleteRule(ruleId),
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
    if (version) publishMutation.mutate(version);
  };

  const handleClone = () => {
    if (version) cloneMutation.mutate(version);
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
    deleteRuleMutation.mutate(id);
  };

  if (policySetsQuery.isLoading || versionQuery.isLoading) {
    return <div className="min-h-screen bg-background px-6 py-10 text-sm text-muted-foreground">Loading policy workspace...</div>;
  }

  if (policySetsQuery.error instanceof Error && policySetsQuery.error.message.toLowerCase().includes('unauthorized')) {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-3 text-xl font-semibold">Admin session required</h1>
          <p className="mb-4 text-sm text-muted-foreground">
            Sign in with an admin API key first, then return to the React app.
          </p>
          <Button asChild>
            <a href="/admin/session/new">Open admin sign-in</a>
          </Button>
        </div>
      </div>
    );
  }

  if (policySetsQuery.error instanceof Error) {
    return <div className="min-h-screen bg-background px-6 py-10 text-sm text-destructive">{policySetsQuery.error.message}</div>;
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
        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="rules" className="font-mono text-xs">Rules</TabsTrigger>
            <TabsTrigger value="dryrun" className="font-mono text-xs">Dry Run</TabsTrigger>
          </TabsList>
          <TabsContent value="rules">
            <RulesTable
              rules={version.rules}
              isDraft={isDraft}
              onToggle={handleToggleRule}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
              onAdd={handleAddRule}
            />
          </TabsContent>
          <TabsContent value="dryrun">
            <DryRunPanel policyVersionId={version.id} />
          </TabsContent>
        </Tabs>
      </div>
      <RuleEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveRule}
        rule={editingRule}
      />
    </div>
  );
}
