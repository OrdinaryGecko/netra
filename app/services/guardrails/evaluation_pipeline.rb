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
      @reasons = []
      @masked = false
    end

    def call
      RequestValidator.call!(@request_payload)
      policy_version = PolicyResolver.call!(
        client_application: @client_application,
        environment: environment
      )

      request_record = build_request!(policy_version:)
      decision = evaluate_stage!(
        request_record:,
        rules: policy_version.rules.enabled.where(stage: "input"),
        content: combined_input
      )

      if decision[:blocked]
        finalize_block!(request_record:, policy_version:)
      else
        provider_response = Providers::Factory.build(
          provider: @request_payload[:provider],
          model: @request_payload[:model],
          options: @request_payload[:options] || {}
        ).complete(messages: request_messages)

        output_text = provider_response[:content]
        output_decision = evaluate_stage!(
          request_record:,
          rules: policy_version.rules.enabled.where(stage: "output"),
          content: output_text,
          provider_response:
        )

        if output_decision[:blocked]
          request_record.update!(response_payload: provider_response)
          finalize_block!(request_record:, policy_version:)
        else
          finalize_success!(
            request_record:,
            policy_version:,
            provider_response: provider_response.merge(content: maybe_mask(output_text))
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

    def evaluate_stage!(request_record:, rules:, content:, provider_response: nil)
      blocked = false

      rules.each do |rule|
        started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        outcome, details = Guardrails::RuleEvaluator.call(rule:, content:, options: @request_payload[:options] || {})
        latency_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round

        if outcome == "matched"
          @reasons << rule.name
          blocked = true if rule.action == "block"
          @masked ||= rule.action == "mask"
        end

        request_record.guardrail_evaluations.create!(
          stage: rule.stage,
          rule_name: rule.name,
          rule_kind: rule.kind,
          outcome:,
          action: rule.action,
          details: details.merge(provider_response: provider_response&.slice(:provider, :model)),
          latency_ms:
        )
      end

      { blocked: }
    end

    def finalize_block!(request_record:, policy_version:)
      request_record.update!(
        status: "blocked",
        decision: {
          action: "block",
          reasons: @reasons,
          policy_version: policy_version.version
        }
      )

      Result.new(
        status: "blocked",
        action: "block",
        reasons: @reasons,
        trace_id: @trace_id,
        policy_version: policy_version.version,
        provider_response: nil,
        messages: request_messages
      )
    end

    def finalize_success!(request_record:, policy_version:, provider_response:)
      action = @masked ? "mask" : "allow"
      status = "allowed"
      final_response = provider_response.dup

      request_record.update!(
        status:,
        response_payload: final_response,
        decision: {
          action:,
          reasons: @reasons,
          policy_version: policy_version.version
        }
      )

      Result.new(
        status:,
        action:,
        reasons: @reasons,
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

    def maybe_mask(text)
      @masked ? Masker.mask(text) : text
    end
  end
end
