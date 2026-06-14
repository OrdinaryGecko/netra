import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CopyField } from './CopyField';
import { KeyRound, Terminal, Plug } from 'lucide-react';
import { Project } from '@/lib/types';

interface IntegrationPanelProps {
  project: Project;
}

const KEY_PLACEHOLDER = 'nrt_xxxxxxxxxxxxxxxxxxxxxxxxxxxx';

export function IntegrationPanel({ project }: IntegrationPanelProps) {
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');

  const provider = project.upstreamProvider || 'openai';

  const pythonExample = `from openai import OpenAI

client = OpenAI(
    api_key="${KEY_PLACEHOLDER}",
    base_url="${baseUrl}/v1",
    default_headers={
        "X-Netra-Environment": "production",
        "X-Netra-Provider": "${provider}",
        # "X-Netra-Agent-Identifier": "support-bot",
    },
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)`;

  const curlOpenAI = `curl ${baseUrl}/v1/chat/completions \\
  -H "Authorization: Bearer ${KEY_PLACEHOLDER}" \\
  -H "Content-Type: application/json" \\
  -H "X-Netra-Environment: production" \\
  -H "X-Netra-Provider: ${provider}" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`;

  const curlNative = `curl ${baseUrl}/v1/guarded_completions \\
  -H "X-Api-Key: ${KEY_PLACEHOLDER}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "application_key": "${project.key}",
    "environment": "production",
    "provider": "${provider}",
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}],
    "options": {}
  }'`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Plug className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-mono">Project configuration</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Drop these values into your app to route AI traffic through Netra for this project.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <CopyField label="Project key (application_key)" value={project.key} />
            <CopyField label="Upstream provider" value={provider} />
            <CopyField label="X-Netra-Project-Id header" value={String(project.id)} />
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Netra base URL
            </Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="font-mono text-xs"
              placeholder="https://your-netra-instance"
            />
            <p className="font-mono text-[10px] text-muted-foreground">
              Defaults to <code>http://localhost:3000</code> for local dev. Change this to your deployed instance URL.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <KeyRound className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-mono">Runtime API key</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Used in <code>X-Api-Key</code> or <code>Authorization: Bearer</code> headers.
                Create and manage keys from the <strong>API Keys</strong> tab.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">Optional headers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md divide-y text-xs font-mono">
            {[
              ['X-Netra-Environment', 'Set the environment for this request (e.g. production, staging, development).'],
              ['X-Netra-Provider', 'Override the upstream provider (defaults to openai).'],
              ['X-Netra-Agent-Identifier', 'Tag requests with an agent identifier for analytics.'],
              ['X-Netra-Project-Id', 'Switch project context when one runtime key has access to multiple projects.'],
            ].map(([name, desc]) => (
              <div key={name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 px-3 py-2">
                <code className="truncate">{name}</code>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Terminal className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-mono">Code examples</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Replace <code>{KEY_PLACEHOLDER}</code> with your generated runtime key.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="python">
            <TabsList className="font-mono text-xs">
              <TabsTrigger value="python">Python (OpenAI SDK)</TabsTrigger>
              <TabsTrigger value="curl-openai">curl (OpenAI-compatible)</TabsTrigger>
              <TabsTrigger value="curl-native">curl (Native Netra)</TabsTrigger>
            </TabsList>
            <TabsContent value="python" className="mt-3">
              <CopyField value={pythonExample} multiline />
              <p className="font-mono text-[10px] text-muted-foreground mt-2">
                Note: streaming (<code>stream=True</code>) is not supported yet.
              </p>
            </TabsContent>
            <TabsContent value="curl-openai" className="mt-3">
              <CopyField value={curlOpenAI} multiline />
            </TabsContent>
            <TabsContent value="curl-native" className="mt-3">
              <CopyField value={curlNative} multiline />
              <p className="font-mono text-[10px] text-muted-foreground mt-2">
                The native endpoint takes <code>application_key</code> in the body instead of routing by header.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
