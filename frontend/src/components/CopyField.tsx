import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyFieldProps {
  label?: string;
  value: string;
  mono?: boolean;
  multiline?: boolean;
  className?: string;
}

export function CopyField({ label, value, mono = true, multiline = false, className }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      )}
      <div className="group relative flex items-start gap-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors">
        <pre
          className={cn(
            'flex-1 overflow-x-auto px-3 py-2 text-xs',
            mono && 'font-mono',
            multiline ? 'whitespace-pre' : 'whitespace-nowrap'
          )}
        >
          {value}
        </pre>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-2 mr-1 mt-1 shrink-0 font-mono text-[10px] gap-1"
          aria-label="Copy to clipboard"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
