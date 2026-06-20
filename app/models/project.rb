class Project < ApplicationRecord
  UPSTREAM_PROVIDERS = %w[stub openai].freeze

  encrypts :encrypted_upstream_key

  has_many :client_applications, dependent: :nullify
  has_many :agents, dependent: :destroy
  has_many :api_keys, dependent: :destroy
  has_many :policy_sets, dependent: :destroy
  has_many :provider_configs, dependent: :destroy
  has_many :guardrail_requests, dependent: :destroy

  validates :name, :key, :default_environment, presence: true
  validates :key, uniqueness: true
  validates :upstream_provider, inclusion: { in: UPSTREAM_PROVIDERS }, allow_blank: true

  def active_policy_set_for(environment)
    policy_sets.find_by(environment:, active: true)
  end
end
