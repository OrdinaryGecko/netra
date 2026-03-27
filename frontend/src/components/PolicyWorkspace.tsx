import { useState } from 'react';
import { PolicyVersion, Rule } from '@/lib/types';
import { mockPolicyVersion } from '@/lib/mock-data';
import { VersionHeader } from './VersionHeader';
import { RulesTable } from './RulesTable';
import { RuleEditorDialog } from './RuleEditorDialog';
import { DryRunPanel } from './DryRunPanel';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function PolicyWorkspace() {
  const [version, setVersion] = useState<PolicyVersion>({ ...mockPolicyVersion });
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const isDraft = version.status === 'draft';

  const handlePublish = () => {
    setVersion((v) => ({ ...v, status: 'active', updatedAt: new Date().toISOString() }));
    toast.success('Policy version published successfully');
  };

  const handleClone = () => {
    setVersion((v) => ({
      ...v,
      id: `pv-${Date.now()}`,
      version: v.version + 1,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    toast.success('New draft version created');
  };

  const handleToggleRule = (id: string) => {
    setVersion((v) => ({
      ...v,
      rules: v.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    }));
  };

  const handleSaveRule = (rule: Rule) => {
    setVersion((v) => {
      const exists = v.rules.find((r) => r.id === rule.id);
      const rules = exists ? v.rules.map((r) => (r.id === rule.id ? rule : r)) : [...v.rules, rule];
      return { ...v, rules };
    });
    toast.success(editingRule ? 'Rule updated' : 'Rule created');
  };

  const handleDeleteRule = (id: string) => {
    setVersion((v) => ({ ...v, rules: v.rules.filter((r) => r.id !== id) }));
    toast.success('Rule deleted');
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setEditorOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };

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
            <DryRunPanel rules={version.rules} />
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
