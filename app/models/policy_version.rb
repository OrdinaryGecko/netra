class PolicyVersion < ApplicationRecord
  STATUSES = %w[draft active archived].freeze

  belongs_to :policy_set
  has_many :rules, -> { order(priority: :asc, id: :asc) }, dependent: :destroy

  validates :version, :status, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :version, uniqueness: { scope: :policy_set_id }

  def publish!
    transaction do
      policy_set.policy_versions.where(status: "active").update_all(status: "archived")
      update!(status: "active", published_at: Time.current)
    end
  end
end
