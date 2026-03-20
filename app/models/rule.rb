class Rule < ApplicationRecord
  KINDS = %w[max_message_chars keyword_blocklist pii_detector json_format].freeze
  ACTIONS = %w[allow block mask log_only].freeze
  STAGES = %w[input output].freeze

  belongs_to :policy_version

  validates :name, :kind, :stage, :action, presence: true
  validates :kind, inclusion: { in: KINDS }
  validates :stage, inclusion: { in: STAGES }
  validates :action, inclusion: { in: ACTIONS }
  validate :policy_version_must_be_draft

  before_destroy :ensure_policy_version_mutable!

  scope :enabled, -> { where(enabled: true) }

  private

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
