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

const KEY_PLACEHOLDER = 'YOUR_RUNTIME_API_KEY';

export function IntegrationPanel({ project }: IntegrationPanelProps) {
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');

  const provider = project.upstreamProvider || 'openai';
  const orgSlug = window.location.hostname.split('.')[0] || 'default';

  const pythonExample = `from openai import OpenAI

client = OpenAI(
    api_key="${KEY_PLACEHOLDER}",
    base_url="${baseUrl}/v1",
    default_headers={
        "X-Netra-Org-Slug": "${orgSlug}",
        "X-Netra-Environment": "production",
    },
)

# Non-streaming
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)

# Streaming
stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True,
)
for chunk in stream:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)`;

  const curlExample = `curl ${baseUrl}/v1/chat/completions \\
  -H "Authorization: Bearer ${KEY_PLACEHOLDER}" \\
  -H "Content-Type: application/json" \\
  -H "X-Netra-Org-Slug: ${orgSlug}" \\
  -H "X-Netra-Environment: production" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`;

  const curlStreamExample = `curl -N ${baseUrl}/v1/chat/completions \\
  -H "Authorization: Bearer ${KEY_PLACEHOLDER}" \\
  -H "Content-Type: application/json" \\
  -H "X-Netra-Org-Slug: ${orgSlug}" \\
  -H "X-Netra-Environment: production" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
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
            <CopyField label="Organization slug" value={orgSlug} />
            <CopyField label="Upstream provider" value={provider} />
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
                Used in <code>Authorization: Bearer</code> or <code>X-Api-Key</code> header.
                Create and manage keys from the <strong>API Keys</strong> tab.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">Required & optional headers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md divide-y text-xs font-mono">
            {[
              ['X-Netra-Org-Slug', 'Required. Your organization slug for tenant routing.'],
              ['X-Netra-Environment', 'Set the environment for this request (e.g. production, staging, development). Defaults to development.'],
              ['X-Netra-Provider', 'Override the upstream provider configured in project settings.'],
              ['X-Netra-Agent-Identifier', 'Tag requests with an agent identifier for analytics.'],
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
              <TabsTrigger value="curl">curl</TabsTrigger>
              <TabsTrigger value="curl-stream">curl (streaming)</TabsTrigger>
            </TabsList>
            <TabsContent value="python" className="mt-3">
              <CopyField value={pythonExample} multiline />
            </TabsContent>
            <TabsContent value="curl" className="mt-3">
              <CopyField value={curlExample} multiline />
            </TabsContent>
            <TabsContent value="curl-stream" className="mt-3">
              <CopyField value={curlStreamExample} multiline />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
