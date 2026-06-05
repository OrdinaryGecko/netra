class ClientApplication < ApplicationRecord
  belongs_to :project, optional: true

  has_many :agents, dependent: :destroy
  has_many :api_keys, dependent: :destroy
  has_many :policy_sets, dependent: :destroy
  has_many :provider_configs, dependent: :destroy
  has_many :guardrail_requests, dependent: :destroy

  validates :name, :key, presence: true
  validates :key, uniqueness: true

  after_create :ensure_default_project!

  def ensure_default_project!
    return project if project

    organization = Organization.find_or_create_by!(slug: "default") do |org|
      org.name = "Default Organization"
    end

    created_project = organization.projects.find_or_create_by!(key:) do |project|
      project.name = name
      project.default_environment = default_environment
    end

    update_column(:project_id, created_project.id)
    created_project
  end
end
