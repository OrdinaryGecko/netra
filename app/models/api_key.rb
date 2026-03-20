class ApiKey < ApplicationRecord
  ACCESS_LEVELS = %w[runtime admin].freeze

  belongs_to :client_application

  validates :name, :token_digest, :access_level, presence: true
  validates :access_level, inclusion: { in: ACCESS_LEVELS }

  scope :active, -> { where(active: true) }

  def self.issue!(client_application:, name:, access_level: "runtime")
    plaintext = SecureRandom.hex(24)
    record = create!(
      client_application:,
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
end
