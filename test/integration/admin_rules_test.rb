require "test_helper"

class AdminRulesTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    @user = create_owner_in_tenant!("test")
    @headers = auth_headers_for(@user, "test")

    within_tenant("test") do
      @project = Project.create!(name: "Test Project", key: "test-app")
      @client_application = @project.client_applications.create!(name: "Test App", key: "test-app")
      @policy_set = @client_application.policy_sets.create!(name: "default", environment: "development", project: @project)
      @policy_version = @policy_set.policy_versions.create!(version: "1", status: "draft")
    end
  end

  test "creates updates and destroys a rule" do
    post "/v1/admin/rules",
      params: { rule: { policy_version_id: @policy_version.id, name: "mask-pii", kind: "pii_detector", stage: "output", action: "mask", priority: 20, enabled: true, config: {} } },
      as: :json, headers: @headers

    assert_response :created
    created = JSON.parse(response.body)

    patch "/v1/admin/rules/#{created["id"]}",
      params: { rule: { name: "mask-sensitive", priority: 5 } },
      as: :json, headers: @headers

    assert_response :success

    delete "/v1/admin/rules/#{created["id"]}", headers: @headers
    assert_response :no_content
  end
end
