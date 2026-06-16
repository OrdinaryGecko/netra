import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRequestLogs, fetchRequestLog, RequestLogEntry, RequestLogDetail } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  allowed: 'bg-green-500/10 text-green-600 border-green-500/30',
  blocked: 'bg-destructive/10 text-destructive border-destructive/30',
  pending: 'bg-muted text-muted-foreground border-border',
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  allowed: CheckCircle2,
  blocked: XCircle,
  pending: AlertTriangle,
};

interface RequestLogsPanelProps {
  projectId: string;
}

export function RequestLogsPanel({ projectId }: RequestLogsPanelProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const limit = 25;

  const logsQuery = useQuery({
    queryKey: ['request-logs', projectId, statusFilter, envFilter, offset],
    queryFn: () => fetchRequestLogs({
      project_id: projectId,
      status: statusFilter === 'all' ? undefined : statusFilter,
      environment: envFilter === 'all' ? undefined : envFilter,
      limit,
      offset,
    }),
  });

  const detailQuery = useQuery({
    queryKey: ['request-log', selectedId],
    queryFn: () => fetchRequestLog(selectedId!),
    enabled: !!selectedId,
  });

  const logs = logsQuery.data?.requests || [];
  const total = logsQuery.data?.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setOffset(0); }}>
          <SelectTrigger className="w-[140px] font-mono text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-mono text-xs">All statuses</SelectItem>
            <SelectItem value="allowed" className="font-mono text-xs">Allowed</SelectItem>
            <SelectItem value="blocked" className="font-mono text-xs">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={envFilter} onValueChange={(v) => { setEnvFilter(v); setOffset(0); }}>
          <SelectTrigger className="w-[160px] font-mono text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-mono text-xs">All environments</SelectItem>
            <SelectItem value="development" className="font-mono text-xs">Development</SelectItem>
            <SelectItem value="staging" className="font-mono text-xs">Staging</SelectItem>
            <SelectItem value="production" className="font-mono text-xs">Production</SelectItem>
          </SelectContent>
        </Select>
        <span className="font-mono text-xs text-muted-foreground ml-auto">{total} request{total !== 1 ? 's' : ''}</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground font-mono text-sm">
              No request logs yet. Send a request through the guardrails API to see logs here.
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const Icon = statusIcons[log.status] || AlertTriangle;
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedId(log.id)}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', log.status === 'allowed' ? 'text-green-600' : log.status === 'blocked' ? 'text-destructive' : 'text-muted-foreground')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs truncate">{log.trace_id.slice(0, 8)}</span>
                        <Badge variant="outline" className={cn('font-mono text-[10px] uppercase', statusColors[log.status])}>
                          {log.status}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">{log.environment}</span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {log.model} · {log.evaluations_count} rule{log.evaluations_count !== 1 ? 's' : ''} evaluated
                        {log.reasons.length > 0 && ` · ${log.reasons.join(', ')}`}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {new Date(log.occurred_at).toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {total > limit && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="font-mono text-xs">
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <Button variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} className="font-mono text-xs">
            Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

      <Dialog open={!!selectedId} onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">Request Detail</DialogTitle>
          </DialogHeader>
          {detailQuery.data && <RequestDetail data={detailQuery.data} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestDetail({ data }: { data: RequestLogDetail }) {
  return (
    <div className="space-y-4 text-xs font-mono">
      <div className="grid grid-cols-2 gap-3">
        <div><span className="text-muted-foreground">Trace ID:</span> {data.trace_id}</div>
        <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={cn('text-[10px]', statusColors[data.status])}>{data.status}</Badge></div>
        <div><span className="text-muted-foreground">Environment:</span> {data.environment}</div>
        <div><span className="text-muted-foreground">Model:</span> {data.model}</div>
        <div><span className="text-muted-foreground">Action:</span> {data.action || '—'}</div>
        <div><span className="text-muted-foreground">Agent:</span> {data.agent || '—'}</div>
      </div>

      {data.reasons.length > 0 && (
        <div><span className="text-muted-foreground">Reasons:</span> {data.reasons.join(', ')}</div>
      )}

      <div>
        <h4 className="text-muted-foreground mb-1">Messages</h4>
        <div className="border rounded p-2 space-y-1 max-h-40 overflow-y-auto bg-muted/30">
          {data.messages.map((msg, i) => (
            <div key={i}><span className="text-primary">{msg.role}:</span> {msg.content}</div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-muted-foreground mb-1">Evaluations ({data.evaluations.length})</h4>
        <div className="border rounded divide-y">
          {data.evaluations.map((ev) => (
            <div key={ev.id} className="px-3 py-2 flex items-center gap-3">
              <Badge variant="outline" className={cn('text-[10px]', ev.outcome === 'matched' ? 'text-destructive' : 'text-muted-foreground')}>
                {ev.outcome}
              </Badge>
              <span>{ev.rule_name}</span>
              <span className="text-muted-foreground">{ev.stage}</span>
              <span className="text-muted-foreground ml-auto">{ev.latency_ms}ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
