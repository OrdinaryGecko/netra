require "test_helper"

class GuardedCompletionsTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    create_tenant!("test")
    Apartment::Tenant.switch("test") do
      @stub_provider = Provider.find_or_create_by!(name: "Stub Provider") do |p|
        p.provider_type = "stub"
        p.default_model = "stub-v1"
      end
      @project = Project.create!(name: "Guarded Project", key: "guarded-project")
      @client_application = @project.client_applications.create!(name: "Test App", key: "test-app")
      @agent = @client_application.agents.create!(name: "Assistant", identifier: "assistant")
      @project.project_providers.create!(provider: @stub_provider, environment: "development", is_default: true)
      @policy_set = @client_application.policy_sets.create!(name: "default", environment: "development")
      @policy_version = @policy_set.policy_versions.create!(version: "1", status: "draft")
      @policy_version.rules.create!(name: "max-input", kind: "max_message_chars", stage: "input", action: "block", priority: 10, config: { max: 50 })
      @policy_version.rules.create!(name: "json-output", kind: "json_format", stage: "output", action: "block", priority: 20, config: {})
      @policy_version.publish!
      _, @plaintext_key = ApiKey.issue!(client_application: @client_application, name: "Test key")
    end
  end

  test "returns a guarded stub response" do
    post "/v1/guarded_completions",
      params: {
        application_key: "test-app", agent_identifier: "assistant", environment: "development",
        messages: [{ role: "user", content: "Return JSON" }],
        options: { expected_output: { format: "json_object" } }
      },
      as: :json,
      headers: { "X-Api-Key" => @plaintext_key, "X-Netra-Org-Slug" => "test" }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "allowed", body["status"]
  end

  test "blocks an oversized prompt" do
    post "/v1/guarded_completions",
      params: {
        application_key: "test-app", agent_identifier: "assistant", environment: "development",
        messages: [{ role: "user", content: "x" * 60 }]
      },
      as: :json,
      headers: { "X-Api-Key" => @plaintext_key, "X-Netra-Org-Slug" => "test" }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "blocked", body["status"]
  end
end
