class ProviderConfig < ApplicationRecord
  PROVIDERS = %w[stub openai].freeze

  belongs_to :client_application
  belongs_to :project, optional: true

  validates :name, :provider, presence: true
  validates :provider, inclusion: { in: PROVIDERS }

  before_validation :assign_project_from_client_application

  private

  def assign_project_from_client_application
    self.project ||= client_application&.project
  end
end
