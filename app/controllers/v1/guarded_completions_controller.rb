module V1
  class GuardedCompletionsController < BaseController
    before_action :authenticate_api_key!

    def create
      result = Guardrails::EvaluationPipeline.call(
        api_key: Current.api_key,
        client_application: client_application,
        agent: agent,
        request_payload: guarded_completion_params.to_h.deep_symbolize_keys
      )

      render json: result.as_json, status: result.http_status
    rescue ActiveRecord::RecordNotFound => e
      render_error(e.message, status: :not_found)
    rescue Guardrails::PolicyNotFoundError => e
      render_error(e.message, status: :unprocessable_entity)
    rescue Guardrails::ProviderError => e
      render_error(e.message, status: :bad_gateway)
    rescue Guardrails::ValidationError => e
      render_error("invalid_request", status: :unprocessable_entity, details: e.errors)
    end

    private

    def authenticate_api_key!
      raw_token = request.headers["X-Api-Key"].to_s
      api_key = ApiKey.authenticate(raw_token)

      return Current.api_key = api_key if api_key&.active?

      render_error("unauthorized", status: :unauthorized)
      nil
    end

    def client_application
      @client_application ||= Current.api_key.client_application.tap do |app|
        requested_key = guarded_completion_params[:application_key]
        next if requested_key.blank? || requested_key == app.key

        raise ActiveRecord::RecordNotFound, "application does not match API key"
      end
    end

    def agent
      return @agent if defined?(@agent)

      identifier = guarded_completion_params[:agent_identifier]
      @agent = identifier.present? ? client_application.agents.find_by!(identifier:) : nil
    end

    def guarded_completion_params
      params.permit(
        :application_key,
        :agent_identifier,
        :environment,
        :provider,
        :model,
        :idempotency_key,
        metadata: {},
        options: {},
        messages: %i[role content]
      )
    end
  end
end
