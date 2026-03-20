client_application = ClientApplication.find_or_create_by!(key: "demo-app") do |app|
  app.name = "Demo Application"
  app.default_environment = "development"
end

client_application.agents.find_or_create_by!(identifier: "assistant") do |agent|
  agent.name = "Assistant"
  agent.description = "Default agent for MVP requests"
end

client_application.provider_configs.find_or_create_by!(name: "Local Stub") do |provider|
  provider.provider = "stub"
  provider.active = true
end

policy_set = client_application.policy_sets.find_or_create_by!(name: "default", environment: "development")
policy_version = policy_set.policy_versions.find_or_create_by!(version: "2026-03-18.1") do |version|
  version.status = "draft"
  version.definition = { description: "Default MVP guardrails policy" }
end

rules = [
  {
    name: "input-size-limit",
    kind: "max_message_chars",
    stage: "input",
    action: "block",
    priority: 10,
    config: { max: 4_000 }
  },
  {
    name: "prompt-injection-keywords",
    kind: "keyword_blocklist",
    stage: "input",
    action: "block",
    priority: 20,
    config: { keywords: ["ignore previous instructions", "reveal system prompt"] }
  },
  {
    name: "output-pii-mask",
    kind: "pii_detector",
    stage: "output",
    action: "mask",
    priority: 30,
    config: {}
  },
  {
    name: "json-output-enforcer",
    kind: "json_format",
    stage: "output",
    action: "block",
    priority: 40,
    config: {}
  }
]

rules.each do |attributes|
  policy_version.rules.find_or_create_by!(name: attributes[:name]) do |rule|
    rule.assign_attributes(attributes)
  end
end

policy_version.publish! unless policy_version.status == "active"

api_key = client_application.api_keys.find_by(name: "Seeded development key")
unless api_key
  api_key, plaintext = ApiKey.issue!(client_application:, name: "Seeded development key")
  puts "Seeded API key: #{plaintext}"
end

admin_key = client_application.api_keys.find_by(name: "Seeded admin key")
unless admin_key
  admin_key, plaintext = ApiKey.issue!(client_application:, name: "Seeded admin key", access_level: "admin")
  puts "Seeded admin API key: #{plaintext}"
end
