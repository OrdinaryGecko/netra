require "test_helper"

class AdminWebFlowTest < ActionDispatch::IntegrationTest
  setup do
    @client_application = ClientApplication.create!(name: "Test App", key: "test-app")
    @policy_set = @client_application.policy_sets.create!(name: "default", environment: "test")
    @policy_version = @policy_set.policy_versions.create!(version: "1", status: "draft", definition: { "description" => "Draft version" })
    @policy_version.rules.create!(
      name: "block-injection",
      kind: "keyword_blocklist",
      stage: "input",
      action: "block",
      priority: 10,
      config: { keywords: ["ignore previous instructions"] }
    )
    _, @admin_key = ApiKey.issue!(client_application: @client_application, name: "Admin key", access_level: "admin")
  end

  test "signs in and renders the policy version workspace" do
    post "/admin/session", params: { api_key: @admin_key }
    follow_redirect!
    follow_redirect!

    assert_response :success
    assert_match @policy_set.name, response.body

    get "/admin/policy_versions/#{@policy_version.id}"

    assert_response :success
    assert_match @policy_version.version, response.body
    assert_match "Dry run policy version", response.body
    assert_match "Add rule", response.body
  end
end
