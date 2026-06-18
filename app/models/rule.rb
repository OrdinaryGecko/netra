class Rule < ApplicationRecord
  KINDS = %w[max_message_chars keyword_detector pii_detector json_format].freeze
  ACTIONS = %w[allow block mask log_only].freeze
  STAGES = %w[input output].freeze

  ALLOWED_ACTIONS_BY_KIND = {
    "max_message_chars" => %w[block allow log_only],
    "keyword_detector" => %w[block mask allow log_only],
    "pii_detector" => %w[block mask allow log_only],
    "json_format" => %w[block allow log_only]
  }.freeze

  belongs_to :policy_version

  validates :name, :kind, :stage, :action, presence: true
  validates :kind, inclusion: { in: KINDS }
  validates :stage, inclusion: { in: STAGES }
  validates :action, inclusion: { in: ACTIONS }
  validate :action_allowed_for_kind
  validate :mask_not_allowed_on_output
  validate :policy_version_must_be_draft

  before_destroy :ensure_policy_version_mutable!

  scope :enabled, -> { where(enabled: true) }

  private

  def action_allowed_for_kind
    return if kind.blank? || action.blank?

    allowed = ALLOWED_ACTIONS_BY_KIND[kind]
    return if allowed.nil? || allowed.include?(action)

    errors.add(:action, "#{action} is not valid for #{kind} rules")
  end

  def mask_not_allowed_on_output
    return unless action == "mask" && stage == "output"

    errors.add(:action, "mask is not supported on output stage")
  end

  def policy_version_must_be_draft
    return unless policy_version
    return if policy_version.status == "draft"

    errors.add(:policy_version, "must be draft to change rules")
  end

  def ensure_policy_version_mutable!
    return if policy_version&.status == "draft"

    errors.add(:base, "rules can only be removed from draft policy versions")
    throw(:abort)
  end
end
