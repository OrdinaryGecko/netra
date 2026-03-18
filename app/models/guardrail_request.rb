class GuardrailRequest < ApplicationRecord
  belongs_to :client_application
  belongs_to :agent, optional: true
  belongs_to :provider_config, optional: true

  has_many :guardrail_evaluations, dependent: :destroy

  validates :trace_id, :environment, :provider, :model, :status, presence: true
  validates :trace_id, uniqueness: true
end
