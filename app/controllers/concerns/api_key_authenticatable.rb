module ApiKeyAuthenticatable
  extend ActiveSupport::Concern

  private

  def authenticate_api_key!
    authenticate_with_access_levels!(*ApiKey::ACCESS_LEVELS)
  end

  def authenticate_admin_api_key!
    authenticate_with_access_levels!("admin")
  end

  def authenticate_with_access_levels!(*access_levels)
    api_key = authenticate_from_header || authenticate_from_session(access_levels)

    unless api_key
      render_error("unauthorized", status: :unauthorized)
      return
    end

    unless access_levels.include?(api_key.access_level)
      render_error("forbidden", status: :forbidden)
      return
    end

    Current.api_key = api_key
    Current.project = api_key.project_context
  end

  def authenticate_from_header
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

  def authenticate_from_session(access_levels)
    return nil unless respond_to?(:session)
    return nil unless access_levels.include?("admin")

    ApiKey.active.find_by(
      id: session[:admin_api_key_id],
      access_level: "admin"
    )
  end
end
