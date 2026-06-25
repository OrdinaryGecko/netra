# Create organization in public schema (tenant registry)
organization = Organization.find_or_create_by!(slug: "default") do |org|
  org.name = "Default Organization"
end

# Create the tenant schema
begin
  Apartment::Tenant.create(organization.slug)
rescue Apartment::TenantExists
  # already exists
end

# Switch to tenant schema and seed data
Apartment::Tenant.switch(organization.slug) do
  # Create owner user
  user = User.find_or_create_by!(email: "admin@netra.local") do |u|
    u.name = "Admin"
    u.role = "owner"
    u.password = "password"
    u.skip_confirmation!
  end
  user.confirm unless user.confirmed?
  puts "Seeded user: admin@netra.local / password"

  # Create stub provider
  stub_provider = Provider.find_or_create_by!(provider_type: "stub") do |p|
    p.name = "Stub (testing)"
    p.default_model = "stub-v1"
    p.active = true
  end

  # Create project
  project = Project.find_or_create_by!(key: "demo-app") do |p|
    p.name = "Demo Project"
  end

  # Link project to stub provider as default for development and staging
  project.link_stub_providers!

  # Create client application
  client_application = ClientApplication.find_or_create_by!(key: "demo-app") do |app|
    app.name = "Demo Application"
    app.project = project
  end

  # Create agent
  Agent.find_or_create_by!(client_application: client_application, identifier: "assistant") do |agent|
    agent.name = "Assistant"
    agent.description = "Default agent"
    agent.project = project
  end

  # Create provider config
  ProviderConfig.find_or_create_by!(client_application: client_application, name: "Local Stub") do |pc|
    pc.project = project
    pc.provider = "stub"
    pc.active = true
  end

  # Create policy set and rules
  policy_set = PolicySet.find_or_create_by!(client_application: client_application, name: "default", environment: "development") do |ps|
    ps.project = project
  end

  policy_version = policy_set.policy_versions.find_by(version: "1")
  unless policy_version
    policy_version = policy_set.policy_versions.create!(
      version: "1",
      status: "draft",
      definition: { description: "Default guardrails policy" }
    )
  end
  # Reset to draft if not draft (for re-seeding)
  policy_version.update_column(:status, "draft") unless policy_version.status == "draft"

  rules = [
    { name: "input size limit", kind: "max_message_chars", stage: "input", action: "block", priority: 10, config: { max: 4_000 } },
    { name: "prompt injection keywords", kind: "keyword_detector", stage: "input", action: "block", priority: 20, config: { keywords: ["ignore previous instructions", "reveal system prompt"] } },
    { name: "output pii detector", kind: "pii_detector", stage: "output", action: "log_only", priority: 30, config: {} },
    { name: "json output enforcer", kind: "json_format", stage: "output", action: "block", priority: 40, config: {} }
  ]

  rules.each do |attrs|
    policy_version.rules.find_or_create_by!(name: attrs[:name]) do |rule|
      rule.assign_attributes(attrs)
    end
  end

  policy_version.publish! unless policy_version.status == "active"

  # Create runtime API key
  unless client_application.api_keys.exists?(name: "Seeded runtime key")
    _, plaintext = ApiKey.issue!(client_application: client_application, project: project, name: "Seeded runtime key")
    puts "Seeded runtime API key for '#{project.name}': #{plaintext}"
  end
end
