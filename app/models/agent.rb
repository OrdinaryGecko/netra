class Agent < ApplicationRecord
  belongs_to :client_application
  belongs_to :project, optional: true
  has_many :guardrail_requests, dependent: :nullify

  validates :name, :identifier, presence: true
  validates :identifier, uniqueness: { scope: :client_application_id }

  before_validation :assign_project_from_client_application

  private

  def assign_project_from_client_application
    self.project ||= client_application&.project
  end
end
