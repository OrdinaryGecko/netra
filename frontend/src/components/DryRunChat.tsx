import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { dryRunPolicyVersion, dryRunProject } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface DryRunChatProps {
  policyVersionId?: string;
  projectId?: string;
  environment?: string;
  upstreamProvider?: string | null;
  defaultModel?: string | null;
}

export function DryRunChat({ policyVersionId, projectId, environment, upstreamProvider, defaultModel }: DryRunChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const useRealProvider = upstreamProvider && upstreamProvider !== 'stub';

  const mutation = useMutation({
    mutationFn: (content: string) => {
      if (projectId) {
        return dryRunProject(projectId, content, environment, {
          executeProvider: useRealProvider,
          provider: useRealProvider ? upstreamProvider : undefined,
          model: useRealProvider ? (defaultModel || 'gpt-4o') : undefined,
        });
      }
      return dryRunPolicyVersion(policyVersionId!, content, projectId);
    },
    onSuccess: (result, content) => {
      const assistantContent = result.providerResponse?.content as string || '(No response)';
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content },
        { id: `assistant-${Date.now()}`, role: 'assistant', content: assistantContent },
      ]);
      setInput('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSend = () => {
    if (!input.trim() || mutation.isPending) return;
    mutation.mutate(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="font-mono text-xs">Type a message to test your guardrails</div>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm font-mono ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={mutation.isPending}
            className="font-mono text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || mutation.isPending}
            size="icon"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
