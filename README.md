# Netra

AI guardrails middleware. Sits between your application and LLM providers, applies policy rules to requests and responses, and returns audited allow/block/mask decisions.

## Features

- **OpenAI-compatible proxy** — drop-in replacement endpoint at `POST /v1/chat/completions`
- **Deterministic guardrails** — max message length, keyword detection with masking, PII detection, JSON format enforcement
- **Policy composition** — multiple policy sets per environment, priority-ordered, all rules evaluate
- **Versioned policies** — draft → publish → archive lifecycle, clone for safe iteration
- **Multi-tenant** — subdomain-based organization isolation (`acme.netra.local`)
- **Role-based access** — owner, admin, editor, viewer, auditor with enforced permissions
- **React admin console** — policy management, dry-run testing, pipeline visualization, member management
- **Email notifications** — password reset and member invite emails (Letter Opener in dev)
- **Provider abstraction** — built-in `stub` adapter for local dev, OpenAI scaffolded

## Architecture

```
Client App → Netra (API key auth) → Input rules → LLM Provider → Output rules → Response
```

Admin dashboard → Netra (session token auth) → Manage policies, rules, members

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

Authenticate with a runtime API key via `X-Api-Key` or `Authorization: Bearer` header.

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_RUNTIME_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Netra-Environment: development" \
  -d '{
    "model": "stub-v1",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Admin API

Authenticate with email/password → session token.

```bash
# Login
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@netra.local", "password": "password", "org_slug": "default"}'

# Use the returned token
curl http://localhost:3000/v1/admin/projects \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -H "X-Netra-Org-Slug: default"
```

## Rule kinds

| Kind | Actions | Description |
|------|---------|-------------|
| `max_message_chars` | block, allow, log_only | Reject messages exceeding character limit |
| `keyword_detector` | block, mask, allow, log_only | Detect keywords; block or redact with custom replacement |
| `pii_detector` | block, mask, allow, log_only | Detect emails, phone numbers, SSNs |
| `json_format` | block, allow, log_only | Enforce valid JSON output |

## Roles

| Role | Permissions |
|------|-------------|
| owner | Everything, manage all members |
| admin | Manage projects, policies, members (except owners) |
| editor | Edit policies, rules, publish |
| viewer | Read-only access, dry-run |
| auditor | View request logs only |

## Creating organizations

Organizations are created from the backend:

```bash
bin/rails runner '
org = Organization.create!(name: "Acme Corp", slug: "acme")
user = User.create!(name: "Jane", email: "jane@acme.com", password: "changeme")
Membership.create!(user: user, organization: org, role: "owner")
'
```

Then visit `acme.localhost:8080` to sign in.

## Tech stack

- Ruby on Rails 8.1 (API)
- PostgreSQL
- React + TypeScript + Vite (frontend)
- Tailwind CSS + shadcn/ui
- Action Mailer + Letter Opener (dev emails)

## License

MIT
