require "test_helper"

class RuleTest < ActiveSupport::TestCase
  include TenantTestHelper

  setup do
    create_tenant!("test")
    Apartment::Tenant.switch("test") do
      @project = Project.create!(name: "Test", key: "test-proj")
      @client_app = @project.client_applications.create!(name: "Test App", key: "test-app")
      @policy_set = @client_app.policy_sets.create!(name: "default", environment: "development", project: @project)
      @draft_version = @policy_set.policy_versions.create!(version: "1", status: "draft")
    end
  end

  test "valid rule with all required fields" do
    within_tenant("test") do
      rule = @draft_version.rules.new(name: "test", kind: "max_message_chars", stage: "input", action: "block", priority: 10, config: {})
      assert rule.valid?
    end
  end

  test "validates presence of required fields" do
    within_tenant("test") do
      rule = @draft_version.rules.new
      assert_not rule.valid?
      assert rule.errors[:name].any?
      assert rule.errors[:kind].any?
      assert rule.errors[:stage].any?
      assert rule.errors[:action].any?
    end
  end

  test "validates kind inclusion" do
    within_tenant("test") do
      rule = @draft_version.rules.new(name: "test", kind: "bogus", stage: "input", action: "block", priority: 10, config: {})
      assert_not rule.valid?
      assert rule.errors[:kind].any?
    end
  end

  test "validates stage inclusion" do
    within_tenant("test") do
      rule = @draft_version.rules.new(name: "test", kind: "max_message_chars", stage: "bogus", action: "block", priority: 10, config: {})
      assert_not rule.valid?
      assert rule.errors[:stage].any?
    end
  end

  test "validates action inclusion" do
    within_tenant("test") do
      rule = @draft_version.rules.new(name: "test", kind: "max_message_chars", stage: "input", action: "bogus", priority: 10, config: {})
      assert_not rule.valid?
      assert rule.errors[:action].any?
    end
  end

  test "mask action allowed for keyword_detector input" do
    within_tenant("test") do
      rule = @draft_version.rules.new(name: "test", kind: "keyword_detector", stage: "input", action: "mask", priority: 10, config: {})
      assert rule.valid?
    end
  end

  test "mask action allowed for pii_detector input" do
    within_tenant("test") do
      rule = @draft_version.rules.new(name: "test", kind: "pii_detector", stage: "input", action: "mask", priority: 10, config: {})
      assert rule.valid?
    end
  end

  test "mask action rejected on output stage" do
    within_tenant("test") do
      rule = @draft_version.rules.new(name: "test", kind: "keyword_detector", stage: "output", action: "mask", priority: 10, config: {})
      assert_not rule.valid?
      assert rule.errors[:action].any?
    end
  end

  test "mask action rejected for max_message_chars" do
    within_tenant("test") do
      rule = @draft_version.rules.new(name: "test", kind: "max_message_chars", stage: "input", action: "mask", priority: 10, config: {})
      assert_not rule.valid?
      assert rule.errors[:action].any?
    end
  end

  test "mask action rejected for json_format" do
    within_tenant("test") do
      rule = @draft_version.rules.new(name: "test", kind: "json_format", stage: "output", action: "mask", priority: 10, config: {})
      assert_not rule.valid?
      assert rule.errors[:action].any?
    end
  end

  test "cannot create rule on active policy version" do
    within_tenant("test") do
      @draft_version.publish!

      rule = @draft_version.rules.new(name: "test", kind: "max_message_chars", stage: "input", action: "block", priority: 10, config: {})
      assert_not rule.valid?
      assert rule.errors[:policy_version].any?
    end
  end

  test "cannot destroy rule on active policy version" do
    within_tenant("test") do
      rule = @draft_version.rules.create!(name: "test", kind: "max_message_chars", stage: "input", action: "block", priority: 10, config: {})
      @draft_version.publish!

      assert_not rule.destroy
    end
  end

  test "scope enabled returns only enabled rules" do
    within_tenant("test") do
      @draft_version.rules.create!(name: "enabled-rule", kind: "max_message_chars", stage: "input", action: "block", priority: 10, config: {}, enabled: true)
      @draft_version.rules.create!(name: "disabled-rule", kind: "max_message_chars", stage: "input", action: "block", priority: 20, config: {}, enabled: false)

      assert_equal 1, @draft_version.rules.enabled.size
      assert_equal "enabled-rule", @draft_version.rules.enabled.first.name
    end
  end
end
