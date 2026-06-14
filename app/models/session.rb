class Session < ApplicationRecord
  TOKEN_EXPIRY = 30.days

  belongs_to :user

  validates :token_digest, presence: true, uniqueness: true
  validates :expires_at, presence: true

  scope :active, -> { where("expires_at > ?", Time.current) }

  def expired?
    expires_at <= Time.current
  end

  def touch_last_active!
    update_column(:last_active_at, Time.current)
  end

  def self.create_for_user!(user, request: nil)
    token = SecureRandom.urlsafe_base64(32)
    session = create!(
      user: user,
      token_digest: Digest::SHA256.hexdigest(token),
      ip_address: request&.remote_ip,
      user_agent: request&.user_agent&.truncate(255),
      expires_at: TOKEN_EXPIRY.from_now
    )
    [session, token]
  end

  def self.find_by_token(token)
    return nil if token.blank?

    find_by(token_digest: Digest::SHA256.hexdigest(token))
  end
end
