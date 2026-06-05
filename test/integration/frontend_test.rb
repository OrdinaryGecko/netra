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

  test "admin session exposes project and organization context" do
    get "/v1/admin/session", as: :json, headers: { "X-Api-Key" => @admin_key }

    assert_response :success
    body = JSON.parse(response.body)

    assert_equal @client_application.project.name, body["project"]["name"]
    assert_equal @client_application.project.organization.slug, body["project"]["organization"]["slug"]
  end

  test "policy set index is scoped to the api key project" do
    other_application = ClientApplication.create!(name: "Other App", key: "other-app")
    other_application.policy_sets.create!(name: "other-default", environment: "test")

    get "/v1/admin/policy_sets", as: :json, headers: { "X-Api-Key" => @admin_key }

    assert_response :success
    names = JSON.parse(response.body).map { |policy_set| policy_set["name"] }

    assert_equal ["default"], names
  end

  test "project index returns projects in the current organization" do
    get "/v1/admin/projects", as: :json, headers: { "X-Api-Key" => @admin_key }

    assert_response :success
    body = JSON.parse(response.body)

    assert body.any? { |project| project["key"] == @client_application.project.key }
    assert body.all? { |project| project["organization"]["slug"] == @client_application.project.organization.slug }
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
