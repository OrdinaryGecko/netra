module Guardrails
  class StreamingEvaluationPipeline
    include PipelineBase

    EVAL_INTERVAL = 500

    def initialize(api_key:, client_application:, agent:, request_payload:, project: nil)
      @api_key = api_key
      @client_application = client_application
      @project = project || api_key.project_context
      @agent = agent
      @request_payload = request_payload
      @trace_id = SecureRandom.uuid
    end

    def call(&block)
      RequestValidator.call!(@request_payload)
      resolve_rules

      input_decision = evaluate_input

      if input_decision[:blocked]
        return { blocked: true, reasons: input_decision[:reasons], trace_id: @trace_id }
      end

      forwarded_messages = apply_input_masking(input_decision)

      accumulated_text = ""
      last_eval_at = 0
      violated = false
      violation_reasons = []
      streaming_output_rules = @output_rules.reject { |rule| rule.kind == "ai_classifier" }

      build_provider.stream(messages: forwarded_messages) do |content, raw_data|
        accumulated_text += content

        if streaming_output_rules.any? && (accumulated_text.length - last_eval_at) >= EVAL_INTERVAL
          last_eval_at = accumulated_text.length
          output_decision = Evaluator.call(rules: streaming_output_rules, content: accumulated_text, options: options, context: evaluation_context)

          if output_decision[:blocked]
            violated = true
            violation_reasons = output_decision[:reasons]
            break
          end
        end

        block.call(:chunk, raw_data)
      end

      unless violated
        if @output_rules.any?
          output_decision = Evaluator.call(rules: @output_rules, content: accumulated_text, options: options, context: evaluation_context)
          if output_decision[:blocked]
            violated = true
            violation_reasons = output_decision[:reasons]
          end
        end
      end

      if violated
        block.call(:error, { error: "guardrails_blocked", reasons: violation_reasons, trace_id: @trace_id }.to_json)
      else
        block.call(:done, nil)
      end

      { blocked: violated, reasons: violation_reasons, trace_id: @trace_id }
    end
  end
end
