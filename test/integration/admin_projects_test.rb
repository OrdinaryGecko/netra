require "test_helper"

class AdminProjectsTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    @user = create_owner_in_tenant!("test")
    @headers = auth_headers_for(@user, "test")

    within_tenant("test") do
      @project = Project.create!(name: "Test Project", key: "test-proj")
    end
  end

  test "lists projects" do
    get "/v1/admin/projects", as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert body.any? { |p| p["key"] == "test-proj" }
  end

  test "shows a project" do
    get "/v1/admin/projects/#{@project.id}", as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "Test Project", body["name"]
  end

  test "creates a project" do
    post "/v1/admin/projects",
      params: { project: { name: "New Project", key: "new-proj" } },
      as: :json, headers: @headers

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "New Project", body["name"]

    within_tenant("test") do
      assert ClientApplication.exists?(key: "new-proj"), "Client application should be auto-created"
    end
  end

  test "updates a project" do
    patch "/v1/admin/projects/#{@project.id}",
      params: { project: { name: "Updated" } },
      as: :json, headers: @headers

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "Updated", body["name"]
  end

  test "dry_run returns evaluations" do
    within_tenant("test") do
      @client_application = @project.client_applications.first || @project.client_applications.create!(name: "Test App", key: "test-proj")
      @policy_set = @client_application.policy_sets.create!(name: "default", environment: "development", project: @project)
      @policy_version = @policy_set.policy_versions.create!(version: "1", status: "draft")
      @policy_version.rules.create!(name: "max-input", kind: "max_message_chars", stage: "input", action: "block", priority: 10, config: { "max" => 50 })
      @policy_version.publish!

      stub_provider = Provider.find_or_create_by!(provider_type: "stub") do |p|
        p.name = "Stub (testing)"
        p.active = true
      end
      @project.link_stub_providers!
    end

    post "/v1/admin/projects/#{@project.id}/dry_run",
      params: { messages: [{ role: "user", content: "Hello" }] },
      as: :json, headers: @headers

    assert_response :success
    body = JSON.parse(response.body)
    assert body.key?("status")
    assert body.key?("evaluations")
  end

  test "rejects unauthenticated requests" do
    get "/v1/admin/projects"
    assert_response :unauthorized
  end

  test "viewer can list but not create" do
    viewer = within_tenant("test") do
      User.create!(email: "viewer@proj.com", name: "Viewer", role: "viewer", password: "password").tap(&:confirm)
    end
    viewer_headers = auth_headers_for(viewer, "test")

    get "/v1/admin/projects", as: :json, headers: viewer_headers
    assert_response :success

    post "/v1/admin/projects",
      params: { project: { name: "Nope", key: "nope" } },
      as: :json, headers: viewer_headers
    assert_response :forbidden
  end
end
