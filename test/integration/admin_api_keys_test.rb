require "test_helper"

class AdminApiKeysTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    @user = create_owner_in_tenant!("test")
    @headers = auth_headers_for(@user, "test")

    within_tenant("test") do
      @project = Project.create!(name: "Key Project", key: "key-proj")
      @client_application = @project.client_applications.create!(name: "Key App", key: "key-proj")
    end
  end

  test "lists API keys for a project" do
    within_tenant("test") do
      ApiKey.issue!(client_application: @client_application, project: @project, name: "existing-key")
    end

    get "/v1/admin/projects/#{@project.id}/api_keys", as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert body.any? { |k| k["name"] == "existing-key" }
  end

  test "creates a new API key" do
    post "/v1/admin/projects/#{@project.id}/api_keys",
      params: { api_key: { name: "new-key" } },
      as: :json, headers: @headers

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "new-key", body["name"]
    assert body["token"].present?, "Should return the plaintext token"
  end

  test "revokes an API key" do
    within_tenant("test") do
      @key_record, = ApiKey.issue!(client_application: @client_application, project: @project, name: "revoke-me")
      @key_id = @key_record.id
    end

    delete "/v1/admin/projects/#{@project.id}/api_keys/#{@key_id}", headers: @headers
    assert_response :no_content

    within_tenant("test") do
      assert_not ApiKey.find(@key_id).active
    end
  end

  test "rejects unauthenticated requests" do
    get "/v1/admin/projects/#{@project.id}/api_keys"
    assert_response :unauthorized
  end
end
