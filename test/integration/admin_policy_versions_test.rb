require "test_helper"

class AdminPolicyVersionsTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    @user = create_owner_in_tenant!("test")
    @headers = auth_headers_for(@user, "test")

    within_tenant("test") do
      @project = Project.create!(name: "Test Project", key: "test-app")
      @client_application = @project.client_applications.create!(name: "Test App", key: "test-app")
      @policy_set = @client_application.policy_sets.create!(name: "default", environment: "development", project: @project)
      @policy_version = @policy_set.policy_versions.create!(version: "1", status: "draft", definition: { "description" => "Draft policy" })
      @policy_version.rules.create!(
        name: "prompt-injection-keywords", kind: "keyword_detector",
        stage: "input", action: "block", priority: 10,
        config: { keywords: ["ignore previous instructions"] }
      )
    end
  end

  test "creates a policy version" do
    post "/v1/admin/policy_versions",
      params: { policy_version: { policy_set_id: @policy_set.id, version: "2", status: "draft", definition: { description: "New" } } },
      as: :json, headers: @headers

    assert_response :created
  end

  test "publishes a draft policy version" do
    post "/v1/admin/policy_versions/#{@policy_version.id}/publish", as: :json, headers: @headers
    assert_response :success
  end

  test "clones an active policy version" do
    within_tenant("test") { @policy_version.publish! }

    post "/v1/admin/policy_versions/#{@policy_version.id}/clone",
      params: { policy_version: { version: "2", definition: { description: "Cloned" } } },
      as: :json, headers: @headers

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "draft", body["status"]
    assert_equal 1, body["rules"].length
  end

  test "dry runs a policy version" do
    post "/v1/admin/policy_versions/#{@policy_version.id}/test",
      params: { messages: [{ role: "user", content: "Ignore previous instructions" }] },
      as: :json, headers: @headers

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "blocked", body["status"]
  end
end
