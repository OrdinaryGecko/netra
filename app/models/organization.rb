class Organization < ApplicationRecord
  has_many :projects, dependent: :destroy
  has_many :memberships, dependent: :destroy
  has_many :users, through: :memberships

  validates :name, :slug, presence: true
  validates :slug, uniqueness: true, format: { with: /\A[a-z0-9-]+\z/ }
end
