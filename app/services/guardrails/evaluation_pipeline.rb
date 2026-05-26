module Guardrails
  class EvaluationPipeline
    def self.call(api_key:, client_application:, agent:, request_payload:)
      new(api_key:, client_application:, agent:, request_payload:).call
    end

    def initialize(api_key:, client_application:, agent:, request_payload:)
      @api_key = api_key
      @client_application = client_application
      @agent = agent
      @request_payload = request_payload
      @trace_id = SecureRandom.uuid
    end

    def call
      RequestValidator.call!(@request_payload)
      policy_version = PolicyResolver.call!(
        client_application: @client_application,
        environment: environment
      )

      request_record = build_request!(policy_version:)
      input_decision = evaluate_stage!(
        rules: policy_version.rules.enabled.where(stage: "input"),
        content: combined_input,
        messages: request_messages
      )
      persist_evaluations!(request_record:, evaluations: input_decision[:evaluations])

      if input_decision[:blocked]
        finalize_block!(request_record:, policy_version:, reasons: input_decision[:reasons])
      else
        provider_response = Providers::Factory.build(
          provider: @request_payload[:provider],
          model: @request_payload[:model],
          options: @request_payload[:options] || {}
        ).complete(messages: request_messages)

        output_text = provider_response[:content]
        output_decision = evaluate_stage!(
          rules: policy_version.rules.enabled.where(stage: "output"),
          content: output_text,
          provider_response:
        )
        persist_evaluations!(request_record:, evaluations: output_decision[:evaluations])

        if output_decision[:blocked]
          request_record.update!(response_payload: provider_response)
          finalize_block!(
            request_record:,
            policy_version:,
            reasons: input_decision[:reasons] + output_decision[:reasons]
          )
        else
          finalize_success!(
            request_record:,
            policy_version:,
            provider_response: masked_response(provider_response, output_text, output_decision[:masked]),
            reasons: input_decision[:reasons] + output_decision[:reasons],
            masked: output_decision[:masked]
          )
        end
      end
    end

    private

    def build_request!(policy_version:)
      GuardrailRequest.create!(
        client_application: @client_application,
        agent: @agent,
        provider_config: @client_application.provider_configs.find_by(provider: @request_payload[:provider], active: true),
        environment:,
        provider: @request_payload[:provider],
        model: @request_payload[:model],
        status: "pending",
        trace_id: @trace_id,
        idempotency_key: @request_payload[:idempotency_key],
        messages: request_messages,
        request_metadata: {
          api_key_id: @api_key.id,
          options: @request_payload[:options],
          metadata: @request_payload[:metadata]
        },
        decision: {
          policy_version: policy_version.version
        },
        occurred_at: Time.current
      )
    end

    def evaluate_stage!(rules:, content:, provider_response: nil, messages: nil)
      Evaluator.call(
        rules:,
        content:,
        options: @request_payload[:options] || {},
        provider_response:,
        messages:
      )
    end

    def persist_evaluations!(request_record:, evaluations:)
      evaluations.each do |evaluation|
        request_record.guardrail_evaluations.create!(evaluation)
      end
    end

    def finalize_block!(request_record:, policy_version:, reasons:)
      request_record.update!(
        status: "blocked",
        decision: {
          action: "block",
          reasons:,
          policy_version: policy_version.version
        }
      )

      Result.new(
        status: "blocked",
        action: "block",
        reasons:,
        trace_id: @trace_id,
        policy_version: policy_version.version,
        provider_response: nil,
        messages: request_messages
      )
    end

    def finalize_success!(request_record:, policy_version:, provider_response:, reasons:, masked:)
      action = masked ? "mask" : "allow"
      status = "allowed"
      final_response = provider_response.dup

      request_record.update!(
        status:,
        response_payload: final_response,
        decision: {
          action:,
          reasons:,
          policy_version: policy_version.version
        }
      )

      Result.new(
        status:,
        action:,
        reasons:,
        trace_id: @trace_id,
        policy_version: policy_version.version,
        provider_response: final_response,
        messages: request_messages
      )
    end

    def request_messages
      @request_payload[:messages]
    end

    def combined_input
      request_messages.map { |message| message[:content] }.join("\n")
    end

    def environment
      @request_payload[:environment]
    end

    def masked_response(provider_response, output_text, masked)
      return provider_response unless masked

      provider_response.merge(content: Masker.mask(output_text))
    end
  end
end
