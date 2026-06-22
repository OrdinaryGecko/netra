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

## Runtime API

Authenticate with a runtime API key via `X-Api-Key` or `Authorization: Bearer` header. Include the org slug header for tenant routing.

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_RUNTIME_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Netra-Org-Slug: default" \
  -H "X-Netra-Environment: development" \
  -d '{
    "model": "stub-v1",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Admin API

Authenticate with email/password → JWT token (returned in `Authorization` response header).

```bash
# Login
curl -s -D - -X POST http://localhost:3000/v1/auth/sign_in \
  -H "Content-Type: application/json" \
  -H "X-Netra-Org-Slug: default" \
  -d '{"user": {"email": "admin@netra.local", "password": "password"}}'

# Use the JWT from the Authorization response header
curl http://localhost:3000/v1/admin/projects \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "X-Netra-Org-Slug: default"
```

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

Organizations are created from the backend. Each org gets its own PostgreSQL schema:

```bash
bin/rails runner '
org = Organization.create!(name: "Acme Corp", slug: "acme")
Apartment::Tenant.create(org.slug)
Apartment::Tenant.switch(org.slug) do
  User.create!(name: "Jane", email: "jane@acme.com", password: "changeme", role: "owner")
end
'
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
