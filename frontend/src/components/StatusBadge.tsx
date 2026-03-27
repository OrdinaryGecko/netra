import { VersionStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<VersionStatus, { label: string; dotClass: string; bgClass: string; textClass: string; borderClass: string }> = {
  draft: { label: 'Draft', dotClass: 'bg-status-draft', bgClass: 'bg-status-draft/10', textClass: 'text-status-draft', borderClass: 'border-status-draft' },
  active: { label: 'Active', dotClass: 'bg-status-active', bgClass: 'bg-status-active/10', textClass: 'text-status-active', borderClass: 'border-status-active' },
  archived: { label: 'Archived', dotClass: 'bg-status-archived', bgClass: 'bg-status-archived/10', textClass: 'text-status-archived', borderClass: 'border-status-archived' },
};

export function StatusBadge({ status }: { status: VersionStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-mono font-medium', cfg.bgClass, cfg.textClass, cfg.borderClass)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotClass, status === 'active' && 'animate-pulse-glow')} />
      {cfg.label}
    </span>
  );
}
