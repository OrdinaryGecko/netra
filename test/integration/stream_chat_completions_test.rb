require "test_helper"

class StreamChatCompletionsTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    create_tenant!("test")
    Apartment::Tenant.switch("test") do
      @project = Project.create!(name: "Stream Project", key: "stream-app")
      @client_application = @project.client_applications.create!(name: "Stream App", key: "stream-app")
      @policy_set = @client_app&.policy_sets&.create!(name: "default", environment: "development", project: @project) ||
                    @client_application.policy_sets.create!(name: "default", environment: "development", project: @project)
      @policy_version = @policy_set.policy_versions.create!(version: "1", status: "draft")
      @policy_version.rules.create!(name: "max-input", kind: "max_message_chars", stage: "input", action: "block", priority: 10, config: { "max" => 50 })
      @policy_version.publish!
      _, @plaintext_key = ApiKey.issue!(client_application: @client_application, name: "Stream key")
    end
  end

  test "streams a chat completion response" do
    post "/v1/chat/completions",
      params: { model: "stub-v1", messages: [{ role: "user", content: "Hello" }], stream: true },
      as: :json,
      headers: { "Authorization" => "Bearer #{@plaintext_key}", "X-Netra-Provider" => "stub", "X-Netra-Org-Slug" => "test" }

    assert_response :success
  end

  test "returns blocked error for oversized input" do
    post "/v1/chat/completions",
      params: { model: "stub-v1", messages: [{ role: "user", content: "x" * 60 }] },
      as: :json,
      headers: { "Authorization" => "Bearer #{@plaintext_key}", "X-Netra-Provider" => "stub", "X-Netra-Org-Slug" => "test" }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "guardrails_blocked", body.dig("error", "code")
  end
end
