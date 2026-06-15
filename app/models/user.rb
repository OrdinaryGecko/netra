class User < ApplicationRecord
  ROLES = %w[owner admin editor viewer auditor].freeze

  devise :database_authenticatable, :recoverable, :trackable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  validates :name, presence: true
  validates :role, presence: true, inclusion: { in: ROLES }

  normalizes :email, with: ->(e) { e.strip.downcase }
end
