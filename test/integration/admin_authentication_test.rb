require "test_helper"

class AdminAuthenticationTest < ActionDispatch::IntegrationTest
  include AdminAuthHelper

  setup do
    @user, @organization = create_admin_user!
    @organization.projects.create!(name: "Test Project", key: "test-app")
  end

  test "rejects unauthenticated admin requests" do
    get "/v1/admin/policy_sets"

    assert_response :unauthorized
  end

  test "allows authenticated user for admin endpoints" do
    get "/v1/admin/policy_sets", headers: admin_session_headers(@user)

    assert_response :success
  end

  test "viewer can read policies but cannot create projects" do
    viewer = User.create!(email: "viewer@test.com", name: "Viewer", password: "password")
    Membership.create!(user: viewer, organization: @organization, role: "viewer")

    get "/v1/admin/projects", headers: admin_session_headers(viewer)
    assert_response :success

    post "/v1/admin/projects",
      params: { project: { name: "New", key: "new", fail_mode: "open" } },
      as: :json,
      headers: admin_session_headers(viewer)
    assert_response :forbidden
  end

  test "auditor cannot read policies" do
    auditor = User.create!(email: "auditor@test.com", name: "Auditor", password: "password")
    Membership.create!(user: auditor, organization: @organization, role: "auditor")

    get "/v1/admin/policy_sets", headers: admin_session_headers(auditor)
    assert_response :forbidden
  end
end
