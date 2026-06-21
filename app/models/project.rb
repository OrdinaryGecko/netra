class Project < ApplicationRecord
  has_many :client_applications, dependent: :nullify
  has_many :agents, dependent: :destroy
  has_many :api_keys, dependent: :destroy
  has_many :policy_sets, dependent: :destroy
  has_many :provider_configs, dependent: :destroy
  has_many :guardrail_requests, dependent: :destroy
  has_many :project_providers, dependent: :destroy
  has_many :providers, through: :project_providers

  validates :name, :key, presence: true
  validates :key, uniqueness: true

  def active_policy_set_for(environment)
    policy_sets.find_by(environment:, active: true)
  end

  def default_provider_for(environment)
    project_providers.defaults.for_environment(environment).includes(:provider).first&.provider
  end

  def link_stub_providers!
    stub = Provider.find_by(provider_type: "stub")
    return unless stub

    %w[development staging].each do |env|
      project_providers.find_or_create_by!(provider: stub, environment: env) do |pp|
        pp.is_default = true
      end
    end
  end
end
