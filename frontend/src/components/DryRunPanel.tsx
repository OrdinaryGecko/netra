import { DryRunChat } from './DryRunChat';

interface DryRunPanelProps {
  policyVersionId: string;
  projectId?: string;
}

export function DryRunPanel({ policyVersionId, projectId }: DryRunPanelProps) {
  return <DryRunChat policyVersionId={policyVersionId} projectId={projectId} />;
}
