class ProviderConfig < ApplicationRecord
  PROVIDERS = %w[stub openai].freeze

  belongs_to :client_application

  validates :name, :provider, presence: true
  validates :provider, inclusion: { in: PROVIDERS }
end
