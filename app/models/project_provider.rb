class ProjectProvider < ApplicationRecord
  ENVIRONMENTS = %w[development staging production].freeze

  belongs_to :project
  belongs_to :provider

  validates :project_id, uniqueness: { scope: [:provider_id, :environment], message: "already has this provider for this environment" }
  validates :environment, presence: true, inclusion: { in: ENVIRONMENTS }
  validate :only_one_default_per_project_per_environment

  scope :defaults, -> { where(is_default: true) }
  scope :for_environment, ->(env) { where(environment: env) }

  after_save :ensure_single_default

  private

  def only_one_default_per_project_per_environment
    return unless is_default?

    existing = ProjectProvider.where(project_id: project_id, environment: environment, is_default: true)
    existing = existing.where.not(id: id) if persisted?
    if existing.exists?
      errors.add(:is_default, "already exists for this project in #{environment}")
    end
  end

  def ensure_single_default
    return unless is_default?

    ProjectProvider.where(project_id: project_id, environment: environment, is_default: true)
      .where.not(id: id)
      .update_all(is_default: false)
  end
end
