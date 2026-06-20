require "test_helper"

class AdminRequestLogsTest < ActionDispatch::IntegrationTest
  include TenantTestHelper

  setup do
    @user = create_owner_in_tenant!("test")
    @headers = auth_headers_for(@user, "test")

    within_tenant("test") do
      @project = Project.create!(name: "Log Project", key: "log-proj")
      @client_application = @project.client_applications.create!(name: "Log App", key: "log-proj")

      GuardrailRequest.create!(
        client_application: @client_application,
        project: @project,
        provider: "stub",
        model: "stub-v1",
        status: "allowed",
        environment: "development",
        trace_id: SecureRandom.uuid,
        messages: [{ role: "user", content: "test" }],
        decision: { action: "allow", reasons: [] },
        occurred_at: Time.current
      )
    end
  end

  test "lists request logs" do
    get "/v1/admin/request_logs", as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert body["requests"].length >= 1
    assert body["total"] >= 1
  end

  test "shows a single request log" do
    within_tenant("test") do
      @log_id = GuardrailRequest.first.id
    end

    get "/v1/admin/request_logs/#{@log_id}", as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert body.key?("messages")
    assert body.key?("evaluations")
  end

  test "filters by status" do
    within_tenant("test") do
      GuardrailRequest.create!(
        client_application: @client_application,
        project: @project,
        provider: "stub",
        model: "stub-v1",
        status: "blocked",
        environment: "development",
        trace_id: SecureRandom.uuid,
        messages: [{ role: "user", content: "bad" }],
        decision: { action: "block", reasons: ["test"] },
        occurred_at: Time.current
      )
    end

    get "/v1/admin/request_logs", params: { status: "blocked" }, as: :json, headers: @headers
    assert_response :success
    body = JSON.parse(response.body)
    assert body["requests"].all? { |r| r["status"] == "blocked" }
  end

  test "rejects unauthenticated requests" do
    get "/v1/admin/request_logs"
    assert_response :unauthorized
  end
end
