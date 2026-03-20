require "test_helper"

class AdminAuthenticationTest < ActionDispatch::IntegrationTest
  setup do
    @client_application = ClientApplication.create!(name: "Test App", key: "test-app")
    _, @runtime_key = ApiKey.issue!(client_application: @client_application, name: "Runtime key")
    _, @admin_key = ApiKey.issue!(client_application: @client_application, name: "Admin key", access_level: "admin")
  end

  test "rejects unauthenticated admin requests" do
    get "/v1/admin/policy_sets"

    assert_response :unauthorized
  end

  test "rejects runtime keys for admin endpoints" do
    get "/v1/admin/policy_sets", headers: { "X-Api-Key" => @runtime_key }

    assert_response :forbidden
  end

  test "allows admin keys for admin endpoints" do
    get "/v1/admin/policy_sets", headers: { "X-Api-Key" => @admin_key }

    assert_response :success
  end
end
