class ApiKey < ApplicationRecord
  ACCESS_LEVELS = %w[runtime admin].freeze

  belongs_to :client_application
  belongs_to :project, optional: true

  validates :name, :token_digest, :access_level, presence: true
  validates :access_level, inclusion: { in: ACCESS_LEVELS }

  before_validation :assign_project_from_client_application

  scope :active, -> { where(active: true) }

  def self.issue!(client_application:, name:, access_level: "runtime", project: nil)
    plaintext = SecureRandom.hex(24)
    project ||= client_application.project

    record = create!(
      client_application:,
      project:,
      name:,
      token_digest: digest(plaintext),
      access_level:
    )

    [record, plaintext]
  end

  def self.authenticate(plaintext)
    return if plaintext.blank?

    api_key = active.find_by(token_digest: digest(plaintext))
    api_key&.tap { |record| record.touch(:last_used_at) }
  end

  def self.digest(plaintext)
    Digest::SHA256.hexdigest(plaintext.to_s)
  end

  def admin?
    access_level == "admin"
  end

  def project_context
    project || client_application&.project
  end

  private

  def assign_project_from_client_application
    self.project ||= client_application&.project
  end
end
