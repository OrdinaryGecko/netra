require "test_helper"

class ChatCompletionsTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    create_tenant!("test")
    Apartment::Tenant.switch("test") do
      @client_application = ClientApplication.create!(name: "Chat App", key: "chat-app")
      @client_application.agents.create!(name: "Assistant", identifier: "assistant")
      @policy_set = @client_application.policy_sets.create!(name: "default", environment: "development")
      @policy_version = @policy_set.policy_versions.create!(version: "1", status: "draft")
      @policy_version.rules.create!(name: "max-input", kind: "max_message_chars", stage: "input", action: "block", priority: 10, config: { max: 20 })
      @policy_version.rules.create!(name: "json-output", kind: "json_format", stage: "output", action: "block", priority: 20, config: {})
      @policy_version.publish!
      _, @plaintext_key = ApiKey.issue!(client_application: @client_application, name: "Chat key")
    end
  end

  test "returns an openai compatible chat completion via bearer auth" do
    post "/v1/chat/completions",
      params: { model: "stub-v1", messages: [{ role: "user", content: "Return JSON" }], response_format: { type: "json_object" } },
      as: :json,
      headers: { "Authorization" => "Bearer #{@plaintext_key}", "X-Netra-Provider" => "stub", "X-Netra-Agent-Identifier" => "assistant", "X-Netra-Org-Slug" => "test" }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "chat.completion", body["object"]
  end

  test "returns a blocked error payload" do
    post "/v1/chat/completions",
      params: { model: "stub-v1", messages: [{ role: "user", content: "x" * 25 }] },
      as: :json,
      headers: { "Authorization" => "Bearer #{@plaintext_key}", "X-Netra-Provider" => "stub", "X-Netra-Org-Slug" => "test" }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_equal "guardrails_blocked", body.dig("error", "code")
  end
end
