module V1
  class ChatCompletionsController < BaseController
    before_action :authenticate_api_key!

    def create
      if chat_completion_params[:stream]
        return render_openai_error(
          "Streaming is not supported yet",
          status: :unprocessable_entity,
          code: "stream_not_supported"
        )
      end

      result = Guardrails::EvaluationPipeline.call(
        api_key: Current.api_key,
        client_application: client_application,
        agent: agent,
        request_payload: normalized_payload
      )

      response.headers["X-Netra-Trace-Id"] = result.trace_id
      response.headers["X-Netra-Policy-Version"] = result.policy_version.to_s
      response.headers["X-Netra-Action"] = result.action.to_s

      if result.status == "blocked"
        render_openai_error(
          "Request blocked by Netra guardrails: #{result.reasons.join(', ')}",
          status: :unprocessable_entity,
          code: "guardrails_blocked",
          details: { reasons: result.reasons, trace_id: result.trace_id, action: result.action }
        )
      else
        render json: OpenAi::ChatCompletionResponse.new(
          result:,
          requested_model: chat_completion_params[:model]
        ).as_json, status: :ok
      end
    rescue ActiveRecord::RecordNotFound => e
      render_openai_error(e.message, status: :not_found, code: "not_found")
    rescue Guardrails::PolicyNotFoundError => e
      render_openai_error(e.message, status: :unprocessable_entity, code: "policy_not_found")
    rescue Guardrails::ProviderError => e
      render_openai_error(e.message, status: :bad_gateway, code: "provider_error")
    rescue Guardrails::ValidationError => e
      render_openai_error("Invalid chat completion request", status: :unprocessable_entity, code: "invalid_request", details: e.errors)
    end

    private

    def client_application
      Current.api_key.client_application
    end

    def agent
      return @agent if defined?(@agent)

      identifier = request.headers["X-Netra-Agent-Identifier"].to_s.presence
      @agent = identifier.present? ? client_application.agents.find_by!(identifier:) : nil
    end

    def normalized_payload
      {
        application_key: client_application.key,
        agent_identifier: agent&.identifier,
        environment: request.headers["X-Netra-Environment"].to_s.presence || client_application.default_environment,
        provider: request.headers["X-Netra-Provider"].to_s.presence || "openai",
        model: chat_completion_params[:model],
        metadata: {},
        options: normalized_options,
        messages: Array(chat_completion_params[:messages]).map { |message| message.to_h.symbolize_keys }
      }
    end

    def normalized_options
      {}.tap do |options|
        if chat_completion_params[:response_format]&.[](:type) == "json_object"
          options[:expected_output] = { format: "json_object" }
        end
      end
    end

    def chat_completion_params
      params.permit(
        :model,
        :stream,
        response_format: [:type],
        messages: %i[role content]
      )
    end

    def render_openai_error(message, status:, code:, details: nil)
      payload = {
        error: {
          message:,
          type: "invalid_request_error",
          code:
        }
      }
      payload[:error][:details] = details if details.present?

      render json: payload, status: status
    end
  end
end
