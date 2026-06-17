class RuntimeAuthMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    request = ActionDispatch::Request.new(env)

    # Only apply to runtime API endpoints
    if runtime_path?(request.path)
      token = extract_token(request)
      if token.blank?
        return unauthorized_response
      end

      # Switch tenant first (Apartment elevator may have already done this)
      api_key = find_api_key(token, env)
      unless api_key
        return unauthorized_response
      end

      # Store in env for controller to pick up
      env["netra.api_key"] = api_key
      env["netra.project"] = api_key.project_context
    end

    @app.call(env)
  end

  private

  def runtime_path?(path)
    path.start_with?("/v1/chat/completions") || path.start_with?("/v1/guarded_completions")
  end

  def extract_token(request)
    token = request.headers["X-Api-Key"].to_s
    if token.blank?
      auth = request.headers["Authorization"].to_s
      scheme, value = auth.split(" ", 2)
      token = value if scheme&.casecmp("Bearer")&.zero?
    end
    token.presence
  end

  def find_api_key(token, env)
    # Apartment elevator should have already switched schema via X-Netra-Org-Slug
    ApiKey.active.includes(:client_application, :project).find_by(token_digest: Digest::SHA256.hexdigest(token))&.tap do |key|
      key.touch(:last_used_at)
    end
  end

  def unauthorized_response
    body = { error: "unauthorized" }.to_json
    [401, { "Content-Type" => "application/json" }, [body]]
  end
end
