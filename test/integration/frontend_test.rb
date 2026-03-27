require "test_helper"

class FrontendTest < ActionDispatch::IntegrationTest
  setup do
    @client_application = ClientApplication.create!(name: "Frontend App", key: "frontend-app")
    @policy_set = @client_application.policy_sets.create!(name: "default", environment: "test")
    @policy_set.policy_versions.create!(version: "1", status: "draft", definition: { "description" => "Draft version" })
    _, @admin_key = ApiKey.issue!(client_application: @client_application, name: "Frontend admin", access_level: "admin")
  end

  test "root redirects to app" do
    get "/"

    assert_redirected_to "/app"
  end

  test "app frontend route responds successfully" do
    get "/app"

    assert_response :success
    assert_match(/<div id="root"><\/div>|Netra/, response.body)
  end

  test "session-authenticated frontend can call admin api" do
    post "/admin/session", params: { api_key: @admin_key }
    get "/v1/admin/policy_sets", as: :json

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "default", body.first["name"]
  end

  test "policy sets index returns all policy versions with version metadata" do
    @policy_set.policy_versions.create!(version: "2", status: "draft", definition: { "description" => "Second draft" })

    get "/v1/admin/policy_sets", as: :json, headers: { "X-Api-Key" => @admin_key }

    assert_response :success
    body = JSON.parse(response.body)
    versions = body.first["policy_versions"]

    assert_equal 2, versions.length
    assert versions.all? { |version| version.key?("rules_count") }
    assert versions.all? { |version| version.key?("updated_at") }
  end
end
