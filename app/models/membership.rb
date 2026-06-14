class Membership < ApplicationRecord
  ROLES = %w[owner admin editor viewer auditor].freeze

  belongs_to :user
  belongs_to :organization

  validates :role, presence: true, inclusion: { in: ROLES }
  validates :user_id, uniqueness: { scope: :organization_id }
end
