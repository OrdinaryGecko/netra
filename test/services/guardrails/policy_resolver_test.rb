require "test_helper"

class PolicyResolverTest < ActiveSupport::TestCase
  include TenantTestHelper

  setup do
    create_tenant!("test")
    Apartment::Tenant.switch("test") do
      @project = Project.create!(name: "Test", key: "test-proj")
      @client_app = @project.client_applications.create!(name: "Test App", key: "test-app")
      @policy_set = @client_app.policy_sets.create!(name: "default", environment: "development", project: @project, active: true, enabled: true)
      @draft_version = @policy_set.policy_versions.create!(version: "1", status: "draft")
      @draft_version.rules.create!(name: "rule-1", kind: "max_message_chars", stage: "input", action: "block", priority: 10, config: {}, enabled: true)
      @draft_version.publish!
      @policy_version = @draft_version.reload
    end
  end

  test "returns active policy sets for environment" do
    within_tenant("test") do
      results = Guardrails::PolicyResolver.call!(
        client_application: @client_app,
        project: @project,
        environment: "development"
      )

      assert_equal 1, results.length
      assert_equal @policy_set, results.first[:policy_set]
      assert_equal @policy_version, results.first[:policy_version]
    end
  end

  test "raises when no active policy set found" do
    within_tenant("test") do
      assert_raises(Guardrails::PolicyNotFoundError) do
        Guardrails::PolicyResolver.call!(
          client_application: @client_app,
          project: @project,
          environment: "nonexistent"
        )
      end
    end
  end

  test "skips policy sets without active version" do
    within_tenant("test") do
      @policy_set.policy_versions.where(status: "active").update_all(status: "archived")

      assert_raises(Guardrails::PolicyNotFoundError) do
        Guardrails::PolicyResolver.call!(
          client_application: @client_app,
          project: @project,
          environment: "development"
        )
      end
    end
  end

  test "excludes disabled policy sets" do
    within_tenant("test") do
      @policy_set.update!(enabled: false)

      assert_raises(Guardrails::PolicyNotFoundError) do
        Guardrails::PolicyResolver.call!(
          client_application: @client_app,
          project: @project,
          environment: "development"
        )
      end
    end
  end

  test "excludes inactive policy sets" do
    within_tenant("test") do
      @policy_set.update!(active: false)

      assert_raises(Guardrails::PolicyNotFoundError) do
        Guardrails::PolicyResolver.call!(
          client_application: @client_app,
          project: @project,
          environment: "development"
        )
      end
    end
  end

  test "returns multiple policy sets ordered by priority" do
    within_tenant("test") do
      ps2 = @client_app.policy_sets.create!(name: "secondary", environment: "development", project: @project, active: true, enabled: true, priority: 5)
      draft2 = ps2.policy_versions.create!(version: "1", status: "draft")
      draft2.rules.create!(name: "rule-2", kind: "keyword_detector", stage: "input", action: "block", priority: 10, config: { "keywords" => ["test"] }, enabled: true)
      draft2.publish!

      @policy_set.update!(priority: 10)

      results = Guardrails::PolicyResolver.call!(
        client_application: @client_app,
        project: @project,
        environment: "development"
      )

      assert_equal 2, results.length
      assert_equal ps2, results.first[:policy_set]
      assert_equal @policy_set, results.last[:policy_set]
    end
  end
end
