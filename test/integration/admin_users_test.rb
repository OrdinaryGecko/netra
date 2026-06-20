require "test_helper"

class AdminUsersTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    @user = create_owner_in_tenant!("test")
    @headers = auth_headers_for(@user, "test")
  end

  test "lists users" do
    get "/v1/admin/users", as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert body.any? { |u| u["email"] == "owner@test.com" }
  end

  test "returns current user via me" do
    get "/v1/admin/users/me", as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "owner@test.com", body["email"]
    assert_equal "owner", body["role"]
  end

  test "creates a new user" do
    post "/v1/admin/users",
      params: { user: { email: "new@test.com", name: "New User", role: "editor" } },
      as: :json, headers: @headers

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "new@test.com", body["email"]
    assert_equal "editor", body["role"]
  end

  test "updates a user role" do
    within_tenant("test") do
      @editor = User.create!(email: "editor@test.com", name: "Editor", role: "editor", password: "password").tap(&:confirm)
      @editor_id = @editor.id
    end

    patch "/v1/admin/users/#{@editor_id}",
      params: { user: { role: "admin" } },
      as: :json, headers: @headers

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "admin", body["role"]
  end

  test "cannot change own role" do
    patch "/v1/admin/users/#{@user.id}",
      params: { user: { role: "viewer" } },
      as: :json, headers: @headers

    assert_response :unprocessable_entity
  end

  test "destroys a user" do
    within_tenant("test") do
      @target = User.create!(email: "delete@test.com", name: "Delete", role: "viewer", password: "password").tap(&:confirm)
      @target_id = @target.id
    end

    delete "/v1/admin/users/#{@target_id}", headers: @headers
    assert_response :no_content

    within_tenant("test") do
      assert_not User.exists?(@target_id)
    end
  end

  test "cannot delete self" do
    delete "/v1/admin/users/#{@user.id}", headers: @headers
    assert_response :unprocessable_entity
  end

  test "viewer cannot create users" do
    viewer = within_tenant("test") do
      User.create!(email: "viewer@u.com", name: "Viewer", role: "viewer", password: "password").tap(&:confirm)
    end
    viewer_headers = auth_headers_for(viewer, "test")

    post "/v1/admin/users",
      params: { user: { email: "nope@test.com", name: "Nope", role: "viewer" } },
      as: :json, headers: viewer_headers
    assert_response :forbidden
  end

  test "non-owner cannot assign owner role" do
    admin = within_tenant("test") do
      User.create!(email: "admin@u.com", name: "Admin", role: "admin", password: "password").tap(&:confirm)
    end
    admin_headers = auth_headers_for(admin, "test")

    within_tenant("test") do
      @target = User.create!(email: "target@test.com", name: "Target", role: "viewer", password: "password").tap(&:confirm)
    end

    patch "/v1/admin/users/#{@target.id}",
      params: { user: { role: "owner" } },
      as: :json, headers: admin_headers
    assert_response :forbidden
  end

  test "update_profile updates name" do
    patch "/v1/admin/users/update_profile",
      params: { name: "Updated Name" },
      as: :json, headers: @headers

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "Updated Name", body["name"]
  end

  test "update_password with correct current password" do
    patch "/v1/admin/users/update_password",
      params: { current_password: "password", new_password: "newpassword123" },
      as: :json, headers: @headers

    assert_response :success
  end

  test "update_password with wrong current password" do
    patch "/v1/admin/users/update_password",
      params: { current_password: "wrong", new_password: "newpassword123" },
      as: :json, headers: @headers

    assert_response :unprocessable_entity
  end

  test "rejects unauthenticated requests" do
    get "/v1/admin/users"
    assert_response :forbidden
  end
end
