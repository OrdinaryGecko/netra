require "test_helper"

class AdminRulesTest < ActionDispatch::IntegrationTest
  setup do
    @client_application = ClientApplication.create!(name: "Test App", key: "test-app")
    @policy_set = @client_application.policy_sets.create!(name: "default", environment: "test")
    @policy_version = @policy_set.policy_versions.create!(version: "1", status: "draft")
    _, @admin_key = ApiKey.issue!(client_application: @client_application, name: "Admin key", access_level: "admin")
  end

  test "creates updates and destroys a rule" do
    post "/v1/admin/rules",
      params: {
        rule: {
          policy_version_id: @policy_version.id,
          name: "mask-pii",
          kind: "pii_detector",
          stage: "output",
          action: "mask",
          priority: 20,
          enabled: true,
          config: {}
        }
      },
      as: :json,
      headers: { "X-Api-Key" => @admin_key }

    assert_response :created
    created = JSON.parse(response.body)
    assert_equal "mask-pii", created["name"]

    patch "/v1/admin/rules/#{created["id"]}",
      params: {
        rule: {
          name: "mask-sensitive-output",
          priority: 5
        }
      },
      as: :json,
      headers: { "X-Api-Key" => @admin_key }

    assert_response :success
    updated = JSON.parse(response.body)
    assert_equal "mask-sensitive-output", updated["name"]
    assert_equal 5, updated["priority"]

    delete "/v1/admin/rules/#{created["id"]}", headers: { "X-Api-Key" => @admin_key }
    assert_response :no_content
    assert_not Rule.exists?(created["id"])
  end

  test "does not create a rule on an active policy version" do
    @policy_version.publish!

    post "/v1/admin/rules",
      params: {
        rule: {
          policy_version_id: @policy_version.id,
          name: "mask-pii",
          kind: "pii_detector",
          stage: "output",
          action: "mask",
          priority: 20,
          enabled: true,
          config: {}
        }
      },
      as: :json,
      headers: { "X-Api-Key" => @admin_key }

    assert_response :unprocessable_entity
  end

  test "rejects mask action for input rules" do
    post "/v1/admin/rules",
      params: {
        rule: {
          policy_version_id: @policy_version.id,
          name: "bad-input-mask",
          kind: "max_message_chars",
          stage: "input",
          action: "mask",
          priority: 20,
          enabled: true,
          config: { max: 30 }
        }
      },
      as: :json,
      headers: { "X-Api-Key" => @admin_key }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert_match(/output-stage/, body["details"].join)
  end
end
