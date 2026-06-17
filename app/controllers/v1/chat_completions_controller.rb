module V1
  class ChatCompletionsController < BaseController
    include ActionController::Live
    skip_before_action :verify_authenticity_token
    before_action :set_current_from_middleware!

    def create
      if chat_completion_params[:stream]
        return handle_streaming
      end

      result = Guardrails::EvaluationPipeline.call(
        api_key: @api_key,
        client_application: client_application,
        agent: agent,
        request_payload: normalized_payload
      )

      response.headers["X-Netra-Trace-Id"] = result.trace_id
      response.headers["X-Netra-Policy-Version"] = result.policy_versions.join(", ")
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

    def handle_streaming
      # Capture context before entering stream (Live thread may lose it)
      tenant = Apartment::Tenant.current
      api_key = @api_key
      project = @project || api_key.project_context
      client_app = client_application
      agent_ref = agent
      payload = normalized_payload.merge(provider: project&.upstream_provider.presence || normalized_payload[:provider])

      response.headers["Content-Type"] = "text/event-stream"
      response.headers["Cache-Control"] = "no-cache"
      response.headers["X-Accel-Buffering"] = "no"

      sse = ActionController::Live::SSE.new(response.stream)

      Apartment::Tenant.switch(tenant) do
        pipeline = Guardrails::StreamingEvaluationPipeline.new(
          api_key: api_key,
          client_application: client_app,
          agent: agent_ref,
          request_payload: payload,
          project: project
        )

        result = pipeline.call do |event_type, data|
          case event_type
          when :chunk
            response.stream.write("data: #{data}\n\n")
          when :error
            response.stream.write("data: #{data}\n\n")
          when :done
            response.stream.write("data: [DONE]\n\n")
          end
        end

        if result[:blocked] && result[:reasons].present?
          response.stream.write("data: #{({ error: { message: "Request blocked: #{result[:reasons].join(', ')}", code: 'guardrails_blocked', reasons: result[:reasons] } }).to_json}\n\n")
        end
      end
    rescue Guardrails::PolicyNotFoundError => e
      response.stream.write("data: #{({ error: { message: e.message, code: 'policy_not_found' } }).to_json}\n\n")
    rescue Guardrails::ProviderError => e
      response.stream.write("data: #{({ error: { message: e.message, code: 'provider_error' } }).to_json}\n\n")
    rescue Guardrails::ValidationError => e
      response.stream.write("data: #{({ error: { message: e.errors.join(', '), code: 'invalid_request' } }).to_json}\n\n")
    rescue => e
      response.stream.write("data: #{({ error: { message: e.message, code: 'internal_error' } }).to_json}\n\n") rescue nil
    ensure
      response.stream.close
    end

    def set_current_from_middleware!
      @api_key = request.env["netra.api_key"]
      @project = request.env["netra.project"]
      @client_app = @api_key&.client_application
      Current.api_key = @api_key
      Current.project = @project
    end

    def client_application
      @client_app
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
        environment: request.headers["X-Netra-Environment"].to_s.presence || "development",
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
