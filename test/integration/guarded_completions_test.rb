require "test_helper"

class GuardedCompletionsTest < ActionDispatch::IntegrationTest
  setup do
    @client_application = ClientApplication.create!(name: "Test App", key: "test-app")
    @agent = @client_application.agents.create!(name: "Assistant", identifier: "assistant")
    @policy_set = @client_application.policy_sets.create!(name: "default", environment: "test")
    @policy_version = @policy_set.policy_versions.create!(version: "1", status: "draft")
    @policy_version.rules.create!(
      name: "max-input",
      kind: "max_message_chars",
      stage: "input",
      action: "block",
      priority: 10,
      config: { max: 50 }
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
    _, @plaintext_key = ApiKey.issue!(client_application: @client_application, name: "Test key")
  end

  test "returns a guarded stub response" do
    post "/v1/guarded_completions",
      params: {
        application_key: "test-app",
        agent_identifier: "assistant",
        environment: "test",
        provider: "stub",
        model: "stub-v1",
        messages: [{ role: "user", content: "Return JSON for this request" }],
        options: { expected_output: { format: "json_object" } }
      },
      as: :json,
      headers: { "X-Api-Key" => @plaintext_key }

    assert_response :success
    body = JSON.parse(response.body)

    assert_equal "allowed", body["status"]
    assert_equal "allow", body["action"]
    assert_match(/\A[0-9a-f-]{36}\z/, body["trace_id"])
  end

  test "blocks an oversized prompt" do
    post "/v1/guarded_completions",
      params: {
        application_key: "test-app",
        agent_identifier: "assistant",
        environment: "test",
        provider: "stub",
        model: "stub-v1",
        messages: [{ role: "user", content: "x" * 60 }]
      },
      as: :json,
      headers: { "X-Api-Key" => @plaintext_key }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)

    assert_equal "blocked", body["status"]
    assert_equal ["max-input"], body["reasons"]
  end
end
