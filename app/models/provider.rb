class Provider < ApplicationRecord
  PROVIDER_TYPES = %w[stub openai anthropic openrouter groq].freeze

  DEFAULT_BASE_URLS = {
    "stub" => nil,
    "openai" => "https://api.openai.com/v1",
    "anthropic" => "https://api.anthropic.com/v1",
    "openrouter" => "https://openrouter.ai/api/v1",
    "groq" => "https://api.groq.com/openai/v1"
  }.freeze

  DEFAULT_MODELS = {
    "stub" => nil,
    "openai" => "gpt-4o",
    "anthropic" => "claude-sonnet-4-20250514",
    "openrouter" => "openai/gpt-4o",
    "groq" => "llama-3.3-70b-versatile"
  }.freeze

  encrypts :api_key

  has_many :project_providers, dependent: :destroy
  has_many :projects, through: :project_providers

  validates :name, presence: true
  validates :provider_type, presence: true, inclusion: { in: PROVIDER_TYPES }
  validates :name, uniqueness: true

  before_validation :set_defaults_from_type, on: :create
  after_update :invalidate_models_cache, if: :saved_change_to_api_key?

  scope :active, -> { where(active: true) }

  def stub?
    provider_type == "stub"
  end

  private

  def set_defaults_from_type
    return unless provider_type.present?

    self.base_url ||= DEFAULT_BASE_URLS[provider_type]
    self.default_model ||= DEFAULT_MODELS[provider_type]
  end

  def invalidate_models_cache
    Rails.cache.delete("provider_models:#{id}")
  end
end
