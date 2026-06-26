# Netra

AI guardrails middleware. Sits between your application and LLM providers, applies policy rules to requests and responses, and returns audited allow/block/mask decisions.

## Features

- **OpenAI-compatible proxy** — drop-in replacement endpoint at `POST /v1/chat/completions`
- **Guardrail rules** — max message length, keyword detection with masking, PII detection, JSON format enforcement, AI classifier rules
- **Policy composition** — multiple policy sets per environment, priority-ordered, all rules evaluate
- **Versioned policies** — draft → publish → archive lifecycle, clone for safe iteration
- **Multi-tenant** — schema-per-tenant isolation via subdomain (`acme.localhost`)
- **Role-based access** — owner, admin, editor, viewer, auditor with enforced permissions
- **React admin console** — policy management, dry-run testing, pipeline visualization, project providers, member management
- **Email notifications** — password reset and member invite emails (Letter Opener in dev)
- **Provider abstraction** — built-in `stub` adapter for local dev and project-scoped provider selection per environment

## Architecture

```
Client App → Netra (API key + org slug) → Input rules → LLM Provider → Output rules → Response
```

Admin dashboard → Netra (JWT auth + org slug) → Manage policies, rules, project providers, members

Each organization gets its own PostgreSQL schema. Tenant isolation is handled by `ros-apartment` — all data (users, projects, policies, rules, requests) lives in the tenant schema. Only the `organizations` table (tenant registry) is shared.

## Local setup

```bash
bundle install
bin/rails db:create db:migrate db:seed
bin/rails server
```

```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:3000 npm run dev
```

Open `http://default.localhost:8080` and sign in:

- **Email:** `admin@netra.local`
- **Password:** `password`

Seeds also print a runtime API key for testing guardrail requests.

## Docker setup

```bash
cp .env.example .env
# Edit .env — generate encryption keys with: bin/rails db:encryption:init
docker compose up --build
```

- Frontend: `http://localhost:8080`
- API: `http://localhost:3000`

To seed the database, set `SEED_DB=true` in `.env`.

## Runtime API

Two endpoints available — both apply guardrail policies before forwarding to the LLM provider. Provider and model are resolved from the project's environment configuration (set in project settings).

### OpenAI-compatible (`/v1/chat/completions`)

Drop-in replacement for OpenAI SDK. Just change the base URL and add headers.

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_RUNTIME_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Netra-Org-Slug: default" \
  -H "X-Netra-Environment: development" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Native API (`/v1/guarded_completions`)

Full control with idempotency, custom metadata, and agent tracking.

```bash
curl http://localhost:3000/v1/guarded_completions \
  -H "Authorization: Bearer YOUR_RUNTIME_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Netra-Org-Slug: default" \
  -d '{
    "environment": "production",
    "messages": [{"role": "user", "content": "Hello"}],
    "idempotency_key": "req-abc-123",
    "metadata": {"user_id": "u-123", "session_id": "s-456"}
  }'
```

Use the native API when you need retry-safe requests (idempotency), custom audit metadata, or agent-level tracking. Use the OpenAI-compatible endpoint for zero-code integration with existing OpenAI SDKs.

## Rule kinds

| Kind | Actions | Description |
|------|---------|-------------|
| `max_message_chars` | block, allow, log_only | Reject messages exceeding character limit |
| `keyword_detector` | block, mask, allow, log_only | Detect keywords; block or redact with custom replacement |
| `pii_detector` | block, mask, allow, log_only | Detect emails, phone numbers, SSNs |
| `json_format` | block, allow, log_only | Enforce valid JSON output |
| `ai_classifier` | block, allow, log_only | Classify prompts or responses with preset AI safety classifiers |

## Roles

| Role | Permissions |
|------|-------------|
| owner | Everything, manage all members |
| admin | Manage projects, policies, members (except owners) |
| editor | Edit policies, rules, publish |
| viewer | Read-only access, dry-run |
| auditor | View request logs only |

## Creating organizations

Run a single command to create an org, owner user, and stub provider:

```bash
bin/rails netra:create_org name="Acme Corp" slug=acme email=jane@acme.com password=changeme
```

Then visit `http://acme.localhost:8080` to sign in.

## Tech stack

- Ruby on Rails 8.1 (API)
- PostgreSQL (schema-per-tenant)
- ros-apartment (multi-tenancy)
- Devise + devise-jwt (authentication)
- React + TypeScript + Vite (frontend)
- Tailwind CSS + shadcn/ui
- Action Mailer + Letter Opener (dev emails)

## License

MIT
