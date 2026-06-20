require "test_helper"

class PolicyVersionTest < ActiveSupport::TestCase
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

  test "publish! transitions draft to active" do
    within_tenant("test") do
      @draft_version.publish!

      assert_equal "active", @draft_version.reload.status
      assert_not_nil @draft_version.published_at
    end
  end

  test "publish! archives previous active version" do
    within_tenant("test") do
      @draft_version.publish!

      v2 = @policy_set.policy_versions.create!(version: "2", status: "draft")
      v2.publish!

      assert_equal "archived", @draft_version.reload.status
      assert_equal "active", v2.reload.status
    end
  end

  test "publish! raises if not draft" do
    within_tenant("test") do
      @draft_version.publish!
      error = assert_raises(ActiveRecord::RecordInvalid) { @draft_version.publish! }
      assert_includes error.message, "only draft"
    end
  end

  test "clone_to_draft! creates a new draft with rules" do
    within_tenant("test") do
      @draft_version.rules.create!(name: "rule-1", kind: "max_message_chars", stage: "input", action: "block", priority: 10, config: { "max" => 100 })
      @draft_version.publish!

      cloned = @draft_version.clone_to_draft!(version: "2")

      assert_equal "draft", cloned.status
      assert_equal "2", cloned.version
      assert_equal 1, cloned.rules.size
      assert_equal "rule-1", cloned.rules.first.name
    end
  end

  test "clone_to_draft! uses auto-generated version if none provided" do
    within_tenant("test") do
      cloned = @draft_version.clone_to_draft!

      assert_equal "draft", cloned.status
      assert cloned.version.include?("-draft-")
    end
  end

  test "cannot update an active version" do
    within_tenant("test") do
      @draft_version.publish!
      active = PolicyVersion.find(@draft_version.id)

      active.version = "changed"
      assert_not active.save
      assert_includes active.errors.full_messages.first, "draft"
    end
  end

  test "cannot destroy an active version" do
    within_tenant("test") do
      @draft_version.publish!
      active = PolicyVersion.find(@draft_version.id)

      assert_not active.destroy
    end
  end

  test "validates status inclusion" do
    within_tenant("test") do
      version = @policy_set.policy_versions.new(version: "x", status: "bogus")
      assert_not version.valid?
      assert version.errors[:status].any?
    end
  end

  test "validates version uniqueness within policy set" do
    within_tenant("test") do
      duplicate = @policy_set.policy_versions.new(version: "1", status: "draft")
      assert_not duplicate.valid?
      assert duplicate.errors[:version].any?
    end
  end

  test "validates only one active version per policy set" do
    within_tenant("test") do
      @draft_version.publish!

      new_draft = @policy_set.policy_versions.create!(version: "2", status: "draft")
      new_draft.status = "active"
      assert_not new_draft.valid?
      assert new_draft.errors[:status].any?
    end
  end
end
