class PasswordResetToken < ApplicationRecord
  TOKEN_EXPIRY = 1.hour

  belongs_to :user

  validates :token_digest, presence: true, uniqueness: true
  validates :expires_at, presence: true

  scope :active, -> { where(used_at: nil).where("expires_at > ?", Time.current) }

  def expired?
    expires_at <= Time.current
  end

  def used?
    used_at.present?
  end

  def use!
    update!(used_at: Time.current)
  end

  def self.generate_for_user!(user)
    token = SecureRandom.urlsafe_base64(32)
    create!(
      user: user,
      token_digest: Digest::SHA256.hexdigest(token),
      expires_at: TOKEN_EXPIRY.from_now
    )
    token
  end

  def self.find_by_token(token)
    return nil if token.blank?

    find_by(token_digest: Digest::SHA256.hexdigest(token))
  end
end
