class Rule < ApplicationRecord
  KINDS = %w[max_message_chars keyword_blocklist pii_detector json_format].freeze
  ACTIONS = %w[allow block mask log_only].freeze
  STAGES = %w[input output].freeze

  belongs_to :policy_version

  validates :name, :kind, :stage, :action, presence: true
  validates :kind, inclusion: { in: KINDS }
  validates :stage, inclusion: { in: STAGES }
  validates :action, inclusion: { in: ACTIONS }

  scope :enabled, -> { where(enabled: true) }
end
