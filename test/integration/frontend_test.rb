require "test_helper"

class FrontendTest < ActionDispatch::IntegrationTest
  setup do
    @client_application = ClientApplication.create!(name: "Frontend App", key: "frontend-app")
    @policy_set = @client_application.policy_sets.create!(name: "default", environment: "test")
    @policy_set.policy_versions.create!(version: "1", status: "draft", definition: { "description" => "Draft version" })
    _, @admin_key = ApiKey.issue!(client_application: @client_application, name: "Frontend admin", access_level: "admin")
  end

  test "root responds as backend health endpoint" do
    get "/"

    assert_response :success
  end

  test "separate frontend can call admin api with admin api key" do
    get "/v1/admin/policy_sets", as: :json, headers: { "X-Api-Key" => @admin_key }

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
