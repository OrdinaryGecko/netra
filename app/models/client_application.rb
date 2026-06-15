class ClientApplication < ApplicationRecord
  belongs_to :project, optional: true

  has_many :agents, dependent: :destroy
  has_many :api_keys, dependent: :destroy
  has_many :policy_sets, dependent: :destroy
  has_many :provider_configs, dependent: :destroy
  has_many :guardrail_requests, dependent: :destroy

  validates :name, :key, presence: true
  validates :key, uniqueness: true
end
