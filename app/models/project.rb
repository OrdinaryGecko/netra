class Project < ApplicationRecord
  FAIL_MODES = %w[open closed].freeze
  UPSTREAM_PROVIDERS = %w[stub openai].freeze

  belongs_to :organization

  has_many :client_applications, dependent: :nullify
  has_many :agents, dependent: :destroy
  has_many :api_keys, dependent: :destroy
  has_many :policy_sets, dependent: :destroy
  has_many :provider_configs, dependent: :destroy
  has_many :guardrail_requests, dependent: :destroy

  validates :name, :key, :default_environment, :fail_mode, presence: true
  validates :key, uniqueness: { scope: :organization_id }
  validates :fail_mode, inclusion: { in: FAIL_MODES }
  validates :upstream_provider, inclusion: { in: UPSTREAM_PROVIDERS }, allow_blank: true

  def active_policy_set_for(environment)
    policy_sets.find_by(environment:, active: true)
  end
end
