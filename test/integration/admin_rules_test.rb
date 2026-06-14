require "test_helper"

class AdminRulesTest < ActionDispatch::IntegrationTest
  include AdminAuthHelper

  setup do
    @user, @organization = create_admin_user!
    @project = @organization.projects.create!(name: "Test Project", key: "test-app")
    @client_application = @project.client_applications.create!(name: "Test App", key: "test-app")
    @policy_set = @client_application.policy_sets.create!(name: "default", environment: "test", project: @project)
    @policy_version = @policy_set.policy_versions.create!(version: "1", status: "draft")
    @headers = admin_session_headers(@user)
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
      headers: @headers

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
      headers: @headers

    assert_response :success
    updated = JSON.parse(response.body)
    assert_equal "mask-sensitive-output", updated["name"]
    assert_equal 5, updated["priority"]

    delete "/v1/admin/rules/#{created["id"]}", headers: @headers
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
      headers: @headers

    assert_response :unprocessable_entity
  end
end
