module Guardrails
  class EvaluationPipeline
    include PipelineBase

    def self.call(api_key:, client_application:, agent:, request_payload:, project: nil)
      new(api_key:, client_application:, agent:, request_payload:, project:).call
    end

    def initialize(api_key:, client_application:, agent:, request_payload:, project: nil)
      @api_key = api_key
      @client_application = client_application
      @project = project || api_key.project_context
      @agent = agent
      @request_payload = request_payload
      @trace_id = SecureRandom.uuid
    end

    def call
      RequestValidator.call!(@request_payload)
      resolve_rules

      request_record = build_request!(policy_versions: @policy_versions)
      input_decision = evaluate_stage!(rules: @input_rules, content: combined_input, messages: request_messages)
      persist_evaluations!(request_record:, evaluations: input_decision[:evaluations])

      if input_decision[:blocked]
        finalize_block!(request_record:, policy_versions: @policy_versions, reasons: input_decision[:reasons])
      else
        forwarded_messages = apply_input_masking(input_decision)

        provider_response = build_provider.complete(messages: forwarded_messages)

        output_text = provider_response[:content]
        output_decision = evaluate_stage!(rules: @output_rules, content: output_text, provider_response:)
        persist_evaluations!(request_record:, evaluations: output_decision[:evaluations])

        if output_decision[:blocked]
          request_record.update!(response_payload: provider_response)
          finalize_block!(
            request_record:,
            policy_versions: @policy_versions,
            reasons: input_decision[:reasons] + output_decision[:reasons]
          )
        else
          finalize_success!(
            request_record:,
            policy_versions: @policy_versions,
            provider_response: masked_response(provider_response, output_text, output_decision[:masked], mask_keywords: output_decision[:mask_keywords], mask_replacement: output_decision[:mask_replacement]),
            reasons: input_decision[:reasons] + output_decision[:reasons],
            masked: output_decision[:masked]
          )
        end
      end
    end

    private

    def build_request!(policy_versions:)
      GuardrailRequest.create!(
        client_application: @client_application,
        project: @project,
        agent: @agent,
        provider_config: provider_config,
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
          policy_versions: policy_versions.map { |pv| { id: pv.id, version: pv.version } }
        },
        occurred_at: Time.current
      )
    end

    def evaluate_stage!(rules:, content:, provider_response: nil, messages: nil)
      Evaluator.call(
        rules:,
        content:,
        options:,
        provider_response:,
        messages:,
        context: evaluation_context
      )
    end

    def persist_evaluations!(request_record:, evaluations:)
      evaluations.each do |evaluation|
        request_record.guardrail_evaluations.create!(evaluation.except(:rule_id))
      end
    end

    def evaluation_context
      {
        project: @project,
        environment:
      }
    end

    def finalize_block!(request_record:, policy_versions:, reasons:)
      request_record.update!(
        status: "blocked",
        decision: {
          action: "block",
          reasons:,
          policy_versions: policy_versions.map { |pv| { id: pv.id, version: pv.version } }
        }
      )

      Result.new(
        status: "blocked",
        action: "block",
        reasons:,
        trace_id: @trace_id,
        policy_versions: policy_versions.map(&:version),
        provider_response: nil,
        messages: request_messages
      )
    end

    def finalize_success!(request_record:, policy_versions:, provider_response:, reasons:, masked:)
      action = masked ? "mask" : "allow"
      status = "allowed"
      final_response = provider_response.dup

      request_record.update!(
        status:,
        response_payload: final_response,
        decision: {
          action:,
          reasons:,
          policy_versions: policy_versions.map { |pv| { id: pv.id, version: pv.version } }
        }
      )

      Result.new(
        status:,
        action:,
        reasons:,
        trace_id: @trace_id,
        policy_versions: policy_versions.map(&:version),
        provider_response: final_response,
        messages: request_messages
      )
    end

    def provider_config
      provider_configs = @project&.provider_configs || @client_application.provider_configs
      provider_configs.find_by(provider: @request_payload[:provider], active: true)
    end

    def masked_response(provider_response, output_text, masked, mask_keywords: [], mask_replacement: "[REDACTED]")
      return provider_response unless masked

      provider_response.merge(content: Masker.mask(output_text, keywords: mask_keywords, replacement: mask_replacement))
    end
  end
end
