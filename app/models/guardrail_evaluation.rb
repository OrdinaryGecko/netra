class GuardrailEvaluation < ApplicationRecord
  belongs_to :guardrail_request

  validates :stage, :rule_name, :outcome, presence: true
end
