require "test_helper"

class AdminPolicySetsTest < ActionDispatch::IntegrationTest
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

  test "lists policy sets" do
    get "/v1/admin/policy_sets", as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert body.any? { |ps| ps["name"] == "default" }
  end

  test "shows a single policy set" do
    get "/v1/admin/policy_sets/#{@policy_set.id}", as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "default", body["name"]
  end

  test "creates a policy set" do
    post "/v1/admin/policy_sets",
      params: { policy_set: { name: "production", environment: "production" } },
      as: :json, headers: @headers

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "production", body["name"]
  end

  test "updates a policy set" do
    patch "/v1/admin/policy_sets/#{@policy_set.id}",
      params: { policy_set: { name: "renamed" } },
      as: :json, headers: @headers

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "renamed", body["name"]
  end

  test "filters by environment" do
    within_tenant("test") do
      @client_application.policy_sets.create!(name: "prod", environment: "production", project: @project)
    end

    get "/v1/admin/policy_sets", params: { environment: "production" }, as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert body.all? { |ps| ps["environment"] == "production" }
  end

  test "rejects unauthenticated requests" do
    get "/v1/admin/policy_sets", as: :json
    assert_response :unauthorized
  end

  test "viewer can list but not create" do
    viewer = within_tenant("test") do
      User.create!(email: "viewer@ps.com", name: "Viewer", role: "viewer", password: "password").tap(&:confirm)
    end
    viewer_headers = auth_headers_for(viewer, "test")

    get "/v1/admin/policy_sets", as: :json, headers: viewer_headers
    assert_response :success

    post "/v1/admin/policy_sets",
      params: { policy_set: { name: "nope", environment: "test" } },
      as: :json, headers: viewer_headers
    assert_response :forbidden
  end
end
