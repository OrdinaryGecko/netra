module Guardrails
  class PolicyVersionTester
    DEFAULT_PROVIDER = "stub".freeze
    DEFAULT_MODEL = "stub-v1".freeze

    def self.call(policy_version:, request_payload:)
      new(policy_version:, request_payload:).call
    end

    def initialize(policy_version:, request_payload:)
      @policy_version = policy_version
      @request_payload = request_payload
    end

    def call
      RequestValidator.call!(normalized_payload)

      input_decision = Evaluator.call(
        rules: @policy_version.rules.enabled.where(stage: "input"),
        content: combined_input,
        options: options
      )

      if input_decision[:blocked]
        return dry_run_result(
          status: "blocked",
          action: "block",
          reasons: input_decision[:reasons],
          provider_response: nil,
          evaluations: input_decision[:evaluations]
        )
      end

      provider_response = execute_provider? ? provider.complete(messages: messages) : simulated_provider_response

      output_decision = Evaluator.call(
        rules: @policy_version.rules.enabled.where(stage: "output"),
        content: provider_response[:content],
        options: options,
        provider_response:
      )

      action = if output_decision[:blocked]
        "block"
      elsif output_decision[:masked]
        "mask"
      else
        "allow"
      end

      status = output_decision[:blocked] ? "blocked" : "allowed"
      final_response = output_decision[:masked] ? provider_response.merge(content: Masker.mask(provider_response[:content])) : provider_response

      dry_run_result(
        status:,
        action:,
        reasons: input_decision[:reasons] + output_decision[:reasons],
        provider_response: output_decision[:blocked] ? nil : final_response,
        evaluations: input_decision[:evaluations] + output_decision[:evaluations]
      )
    end

    private

    def dry_run_result(status:, action:, reasons:, provider_response:, evaluations:)
      Result.new(
        status:,
        action:,
        reasons:,
        trace_id: SecureRandom.uuid,
        policy_version: @policy_version.version,
        provider_response:,
        messages: messages,
        evaluations:,
        dry_run: true
      )
    end

    def provider
      Providers::Factory.build(provider: provider_name, model: model_name, options:)
    end

    def provider_name
      normalized_payload[:provider]
    end

    def model_name
      normalized_payload[:model]
    end

    def options
      normalized_payload[:options] || {}
    end

    def messages
      normalized_payload[:messages]
    end

    def combined_input
      messages.map { |message| message[:content] }.join("\n")
    end

    def execute_provider?
      ActiveModel::Type::Boolean.new.cast(normalized_payload[:execute_provider])
    end

    def simulated_provider_response
      {
        provider: provider_name,
        model: model_name,
        content: messages.last[:content].to_s
      }
    end

    def normalized_payload
      @normalized_payload ||= {
        environment: @request_payload[:environment] || @policy_version.policy_set.environment,
        provider: @request_payload[:provider].presence || DEFAULT_PROVIDER,
        model: @request_payload[:model].presence || DEFAULT_MODEL,
        options: @request_payload[:options] || {},
        messages: @request_payload[:messages] || [],
        execute_provider: @request_payload[:execute_provider]
      }
    end
  end
end
