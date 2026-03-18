class Agent < ApplicationRecord
  belongs_to :client_application
  has_many :guardrail_requests, dependent: :nullify

  validates :name, :identifier, presence: true
  validates :identifier, uniqueness: { scope: :client_application_id }
end
