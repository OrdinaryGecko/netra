require "test_helper"

class ChatCompletionsTest < ActionDispatch::IntegrationTest
  setup do
    @client_application = ClientApplication.create!(
      name: "Chat App",
      key: "chat-app",
      default_environment: "test"
    )
    @client_application.agents.create!(name: "Assistant", identifier: "assistant")
    @policy_set = @client_application.policy_sets.create!(name: "default", environment: "test")
    @policy_version = @policy_set.policy_versions.create!(version: "1", status: "draft")
    @policy_version.rules.create!(
      name: "max-input",
      kind: "max_message_chars",
      stage: "input",
      action: "block",
      priority: 10,
      config: { max: 20 }
    )
    @policy_version.rules.create!(
      name: "json-output",
      kind: "json_format",
      stage: "output",
      action: "block",
      priority: 20,
      config: {}
    )
    @policy_version.publish!
    _, @plaintext_key = ApiKey.issue!(client_application: @client_application, name: "Chat key")
  end

  test "returns an openai compatible chat completion via bearer auth" do
    post "/v1/chat/completions",
      params: {
        model: "stub-v1",
        messages: [{ role: "user", content: "Return JSON" }],
        response_format: { type: "json_object" }
      },
      as: :json,
      headers: {
        "Authorization" => "Bearer #{@plaintext_key}",
        "X-Netra-Provider" => "stub",
        "X-Netra-Agent-Identifier" => "assistant"
      }

    assert_response :success
    body = JSON.parse(response.body)

    assert_equal "chat.completion", body["object"]
    assert_equal "stub-v1", body["model"]
    assert_equal "assistant", body.dig("choices", 0, "message", "role")
  end

  test "returns an openai style blocked error payload" do
    post "/v1/chat/completions",
      params: {
        model: "stub-v1",
        messages: [{ role: "user", content: "x" * 25 }]
      },
      as: :json,
      headers: {
        "Authorization" => "Bearer #{@plaintext_key}",
        "X-Netra-Provider" => "stub"
      }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)

    assert_equal "guardrails_blocked", body.dig("error", "code")
    assert_match(/Request blocked by Netra guardrails/i, body.dig("error", "message"))
    assert_equal ["max-input"], body.dig("error", "details", "reasons")
  end

  test "rejects streaming requests for now" do
    post "/v1/chat/completions",
      params: {
        model: "stub-v1",
        stream: true,
        messages: [{ role: "user", content: "Hello" }]
      },
      as: :json,
      headers: {
        "Authorization" => "Bearer #{@plaintext_key}",
        "X-Netra-Provider" => "stub"
      }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)

    assert_equal "stream_not_supported", body.dig("error", "code")
  end
end
