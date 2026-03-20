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
    api_key = ApiKey.authenticate(request.headers["X-Api-Key"].to_s)

    unless api_key
      render_error("unauthorized", status: :unauthorized)
      return
    end

    unless access_levels.include?(api_key.access_level)
      render_error("forbidden", status: :forbidden)
      return
    end

    Current.api_key = api_key
  end
end
