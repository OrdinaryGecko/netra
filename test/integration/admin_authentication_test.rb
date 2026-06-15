require "test_helper"

class AdminAuthenticationTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    @user = create_owner_in_tenant!("test")
    within_tenant("test") do
      Project.create!(name: "Test Project", key: "test-app")
    end
  end

  test "rejects unauthenticated admin requests" do
    get "/v1/admin/projects", headers: { "X-Netra-Org-Slug" => "test" }
    assert_response :unauthorized
  end

  test "allows authenticated user for admin endpoints" do
    get "/v1/admin/projects", headers: auth_headers_for(@user, "test")
    assert_response :success
  end

  test "viewer can read but cannot create projects" do
    viewer = within_tenant("test") do
      User.create!(email: "viewer@test.com", name: "Viewer", role: "viewer", password: "password")
    end

    get "/v1/admin/projects", headers: auth_headers_for(viewer, "test")
    assert_response :success

    post "/v1/admin/projects",
      params: { project: { name: "New", key: "new", fail_mode: "open" } },
      as: :json,
      headers: auth_headers_for(viewer, "test")
    assert_response :forbidden
  end
end
