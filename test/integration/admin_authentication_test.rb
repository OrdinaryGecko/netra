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
end
