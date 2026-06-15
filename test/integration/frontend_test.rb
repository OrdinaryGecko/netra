require "test_helper"

class FrontendTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    @user = create_owner_in_tenant!("test")
    @headers = auth_headers_for(@user, "test")

    within_tenant("test") do
      @project = Project.create!(name: "Frontend Project", key: "frontend-app")
      @client_application = @project.client_applications.create!(name: "Frontend App", key: "frontend-app")
      @policy_set = @client_application.policy_sets.create!(name: "default", environment: "development", project: @project)
      @policy_set.policy_versions.create!(version: "1", status: "draft", definition: { "description" => "Draft" })
    end
  end

  test "root responds as health endpoint" do
    get "/"
    assert_response :success
  end

  test "authenticated user can list policy sets" do
    get "/v1/admin/policy_sets", as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "default", body.first["name"]
  end

  test "project index returns projects" do
    get "/v1/admin/projects", as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert body.any? { |p| p["key"] == "frontend-app" }
  end

  test "policy sets scoped to current tenant only" do
    # Create another tenant with its own data
    create_tenant!("other")
    within_tenant("other") do
      other_project = Project.create!(name: "Other", key: "other-app")
      other_app = other_project.client_applications.create!(name: "Other", key: "other-app")
      other_app.policy_sets.create!(name: "other-default", environment: "development", project: other_project)
    end

    get "/v1/admin/policy_sets", as: :json, headers: @headers
    names = JSON.parse(response.body).map { |ps| ps["name"] }
    assert_equal ["default"], names
  end
end
