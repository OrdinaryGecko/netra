class PolicySet < ApplicationRecord
  belongs_to :client_application
  has_many :policy_versions, dependent: :destroy

  validates :name, :environment, presence: true
  validates :name, uniqueness: { scope: %i[client_application_id environment] }

  def active_version
    policy_versions.find_by(status: "active")
  end
end
