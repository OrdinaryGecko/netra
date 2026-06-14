require "test_helper"

class FrontendTest < ActionDispatch::IntegrationTest
  include AdminAuthHelper

  setup do
    @user, @organization = create_admin_user!
    @project = @organization.projects.create!(name: "Frontend Project", key: "frontend-app")
    @client_application = @project.client_applications.create!(name: "Frontend App", key: "frontend-app")
    @policy_set = @client_application.policy_sets.create!(name: "default", environment: "test", project: @project)
    @policy_set.policy_versions.create!(version: "1", status: "draft", definition: { "description" => "Draft version" })
    @headers = admin_session_headers(@user)
  end

  test "root responds as backend health endpoint" do
    get "/"

    assert_response :success
  end

  test "authenticated user can call admin api" do
    get "/v1/admin/policy_sets", as: :json, headers: @headers

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "default", body.first["name"]
  end

  test "policy set index is scoped to the user organization" do
    other_org = Organization.create!(name: "Other Org", slug: "other-org")
    other_project = other_org.projects.create!(name: "Other Project", key: "other-app")
    other_app = other_project.client_applications.create!(name: "Other App", key: "other-app")
    other_app.policy_sets.create!(name: "other-default", environment: "test", project: other_project)

    get "/v1/admin/policy_sets", as: :json, headers: @headers

    assert_response :success
    names = JSON.parse(response.body).map { |policy_set| policy_set["name"] }

    assert_equal ["default"], names
  end

  test "project index returns projects in the current organization" do
    get "/v1/admin/projects", as: :json, headers: @headers

    assert_response :success
    body = JSON.parse(response.body)

    assert body.any? { |project| project["key"] == "frontend-app" }
  end

  test "admin policy APIs can be scoped to another project in the same organization" do
    other_project = @organization.projects.create!(name: "Other Project", key: "other-project-app")
    other_app = other_project.client_applications.create!(name: "Other Project App", key: "other-project-app")
    other_policy_set = other_app.policy_sets.create!(name: "other-default", environment: "test", project: other_project)
    other_policy_set.policy_versions.create!(version: "1", status: "draft", definition: { "description" => "Other draft" })

    get "/v1/admin/policy_sets",
      as: :json,
      headers: @headers.merge("X-Netra-Project-Id" => other_project.id.to_s)

    assert_response :success
    names = JSON.parse(response.body).map { |policy_set| policy_set["name"] }

    assert_equal ["other-default"], names
  end

  test "policy sets index returns all policy versions with version metadata" do
    @policy_set.policy_versions.create!(version: "2", status: "draft", definition: { "description" => "Second draft" })

    get "/v1/admin/policy_sets", as: :json, headers: @headers

    assert_response :success
    body = JSON.parse(response.body)
    versions = body.first["policy_versions"]

    assert_equal 2, versions.length
    assert versions.all? { |version| version.key?("rules_count") }
    assert versions.all? { |version| version.key?("updated_at") }
  end
end
