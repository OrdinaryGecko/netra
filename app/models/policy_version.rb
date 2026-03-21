class PolicyVersion < ApplicationRecord
  STATUSES = %w[draft active archived].freeze

  belongs_to :policy_set
  has_many :rules, -> { order(priority: :asc, id: :asc) }, dependent: :destroy

  validates :version, :status, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :version, uniqueness: { scope: :policy_set_id }
  validate :active_version_uniqueness, if: -> { status == "active" }

  before_update :ensure_mutable!
  before_destroy :ensure_mutable!

  def publish!
    unless status == "draft"
      errors.add(:base, "only draft policy versions can be published; clone this version into a draft first")
      raise ActiveRecord::RecordInvalid, self
    end

    transaction do
      policy_set.policy_versions.where(status: "active").update_all(status: "archived")
      update!(status: "active", published_at: Time.current)
    end
  end

  def clone_to_draft!(version: nil, definition: nil)
    transaction do
      cloned_version = policy_set.policy_versions.create!(
        version: version.presence || next_draft_version,
        status: "draft",
        definition: definition.presence || self.definition
      )

      rules.find_each do |rule|
        cloned_version.rules.create!(
          name: rule.name,
          kind: rule.kind,
          stage: rule.stage,
          action: rule.action,
          priority: rule.priority,
          enabled: rule.enabled,
          config: rule.config
        )
      end

      cloned_version
    end
  end

  private

  def ensure_mutable!
    return if status_before_last_save == "draft" || status_was == "draft"

    errors.add(:base, "only draft policy versions can be changed")
    throw(:abort)
  end

  def active_version_uniqueness
    return unless policy_set

    if policy_set.policy_versions.where(status: "active").where.not(id: id).exists?
      errors.add(:status, "already has an active version for this policy set")
    end
  end

  def next_draft_version
    "#{version}-draft-#{Time.current.utc.strftime('%Y%m%d%H%M%S')}"
  end
end
