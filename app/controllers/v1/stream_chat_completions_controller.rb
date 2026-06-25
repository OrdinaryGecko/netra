module V1
  class StreamChatCompletionsController < BaseController
    include ActionController::Live

    before_action :set_context_from_middleware!

    def create
      tenant = Apartment::Tenant.current
      api_key = @api_key
      project = @project
      client_app = @client_app
      agent_ref = resolve_agent
      payload = build_payload(project)

      response.headers["Content-Type"] = "text/event-stream"
      response.headers["Cache-Control"] = "no-cache"
      response.headers["X-Accel-Buffering"] = "no"

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

    private

    def set_context_from_middleware!
      @api_key = request.env["netra.api_key"]
      @project = request.env["netra.project"]
      @client_app = @api_key&.client_application
    end

    def resolve_agent
      identifier = request.headers["X-Netra-Agent-Identifier"].to_s.presence
      identifier.present? ? @client_app&.agents&.find_by(identifier: identifier) : nil
    end

    def build_payload(project)
      {
        application_key: @client_app&.key,
        agent_identifier: resolve_agent&.identifier,
        environment: request.headers["X-Netra-Environment"].to_s.presence || "development",
        metadata: {},
        options: normalized_options,
        messages: Array(params[:messages]).map { |m| m.to_unsafe_h.symbolize_keys }
      }
    end

    def normalized_options
      {}.tap do |opts|
        if params.dig(:response_format, :type) == "json_object"
          opts[:expected_output] = { format: "json_object" }
        end
      end
    end
  end
end
