module ApiKeyAuthenticatable
  extend ActiveSupport::Concern

  private

  def authenticate_api_key!
    api_key = authenticate_from_api_key_header

    unless api_key
      render_error("unauthorized", status: :unauthorized)
      return
    end

    Current.api_key = api_key
    Current.project = requested_project_context(api_key) || api_key.project_context
  end

  def authenticate_from_api_key_header
    token = request.headers["X-Api-Key"].to_s
    token = bearer_token if token.blank?
    return nil if token.blank?

    ApiKey.authenticate(token)
  end

  def bearer_token
    authorization = request.headers["Authorization"].to_s
    scheme, token = authorization.split(" ", 2)
    return nil unless scheme&.casecmp("Bearer")&.zero?

    token.to_s
  end

  def requested_project_context(api_key)
    project_id = request.headers["X-Netra-Project-Id"].to_s.presence
    return nil unless project_id

    organization = api_key.project_context&.organization
    return nil unless organization

    organization.projects.find_by(id: project_id)
  end
end
