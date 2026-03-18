class ApiKey < ApplicationRecord
  belongs_to :client_application

  validates :name, :token_digest, presence: true

  scope :active, -> { where(active: true) }

  def self.issue!(client_application:, name:)
    plaintext = SecureRandom.hex(24)
    record = create!(
      client_application:,
      name:,
      token_digest: digest(plaintext)
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
end
