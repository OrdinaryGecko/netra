class PolicySet < ApplicationRecord
  belongs_to :client_application
  belongs_to :project, optional: true
  has_many :policy_versions, dependent: :destroy

  validates :name, :environment, presence: true
  validates :name, uniqueness: { scope: %i[client_application_id environment] }

  before_validation :assign_project_from_client_application

  def active_version
    policy_versions.find_by(status: "active")
  end

  private

  def assign_project_from_client_application
    self.project ||= client_application&.project
  end
end
