# Netra

Netra is a backend-only Rails MVP for AI guardrails. It sits between an agent
and an LLM provider, resolves the active policy version for the caller, runs
deterministic checks on both the input and the output, and returns an audited
decision.

## Current MVP

- API-key protected `POST /v1/guarded_completions`
- Versioned policy sets and rules persisted in PostgreSQL
- Deterministic guardrails:
  - maximum prompt size
  - keyword blocklists
  - PII detection
  - JSON output enforcement
- Provider abstraction with a built-in `stub` adapter for local development
- Immutable request and evaluation traces

## Core domain

- `ClientApplication`: tenant or calling service
- `Agent`: optional scoped caller within an application
- `ApiKey`: hashed API key used to authenticate requests
- `PolicySet`: environment-specific policy bundle
- `PolicyVersion`: immutable policy revision, one active at a time
- `Rule`: deterministic guardrail definition
- `GuardrailRequest`: top-level API request audit record
- `GuardrailEvaluation`: per-rule evaluation record

## Local setup

```bash
bundle install
bin/rails db:create db:migrate db:seed
bin/rails server
```

The seed task creates:

- one application: `demo-app`
- one agent: `assistant`
- one active policy set for `development`
- one API key printed at seed time

## Example request

```bash
curl -X POST http://localhost:3000/v1/guarded_completions \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_SEEDED_KEY" \
  -d '{
    "application_key": "demo-app",
    "agent_identifier": "assistant",
    "environment": "development",
    "provider": "stub",
    "model": "stub-v1",
    "messages": [
      { "role": "user", "content": "Summarize the revenue report in JSON." }
    ],
    "options": {
      "expected_output": {
        "format": "json_object"
      }
    }
  }'
```

## Notes

- The `stub` provider makes the project usable without external LLM credentials.
- OpenAI support is scaffolded through the provider adapter interface and can be
  extended without changing the policy pipeline.
- This app is designed as a modular monolith so frontend or async features can
  be layered on later without reworking the core contracts.
