require "test_helper"

class SessionsTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    create_tenant!("test")
    Apartment::Tenant.switch("test") do
      @user = User.create!(email: "login@test.com", name: "Login User", role: "admin", password: "password123")
      @user.confirm
    end
  end

  test "login returns user info" do
    post "/v1/auth/sign_in",
      params: { user: { email: "login@test.com", password: "password123" } },
      as: :json,
      headers: { "X-Netra-Org-Slug" => "test" }

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "login@test.com", body.dig("user", "email")
    assert_equal "admin", body.dig("user", "role")
  end

  test "login rejects invalid credentials" do
    post "/v1/auth/sign_in",
      params: { user: { email: "login@test.com", password: "wrong" } },
      as: :json,
      headers: { "X-Netra-Org-Slug" => "test" }

    assert_response :unauthorized
  end

  test "logout returns no content" do
    token = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil).first
    delete "/v1/auth/sign_out",
      headers: { "Authorization" => "Bearer #{token}", "X-Netra-Org-Slug" => "test" }

    assert_response :no_content
  end
end
