module Authorizable
  extend ActiveSupport::Concern

  PERMISSIONS = {
    manage_members:   %w[owner admin],
    manage_projects:  %w[owner admin],
    edit_project:     %w[owner admin editor],
    write_policies:   %w[owner admin editor],
    publish_policies: %w[owner admin editor],
    dry_run:          %w[owner admin editor viewer],
    read_policies:    %w[owner admin editor viewer],
    read_logs:        %w[owner admin editor viewer auditor]
  }.freeze

  private

  def authorize!(action)
    allowed_roles = PERMISSIONS[action]
    raise "Unknown permission: #{action}" unless allowed_roles

    role = current_user&.role
    return if role && allowed_roles.include?(role)

    render_error("forbidden", status: :forbidden, details: ["Insufficient permissions"])
  end
end
