class GuardrailRequest < ApplicationRecord
  belongs_to :client_application
  belongs_to :project, optional: true
  belongs_to :agent, optional: true
  belongs_to :provider_config, optional: true

  has_many :guardrail_evaluations, dependent: :destroy

  validates :trace_id, :environment, :provider, :model, :status, presence: true
  validates :trace_id, uniqueness: true

  before_validation :assign_project_from_client_application

  private

  def assign_project_from_client_application
    self.project ||= client_application&.project
  end
end
