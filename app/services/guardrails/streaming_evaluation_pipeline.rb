module Guardrails
  class StreamingEvaluationPipeline
    EVAL_INTERVAL = 500 # characters between output rule checks

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

      resolved_sets = PolicyResolver.call!(
        client_application: @client_application,
        project: @project,
        environment: environment
      )

      all_rules = composed_rules(resolved_sets)
      input_rules = all_rules.select { |r| r.stage == "input" }
      output_rules = all_rules.select { |r| r.stage == "output" }

      # Run input rules (blocking)
      input_decision = Evaluator.call(
        rules: input_rules,
        content: combined_input,
        options: @request_payload[:options] || {},
        messages: request_messages
      )

      if input_decision[:blocked]
        return { blocked: true, reasons: input_decision[:reasons], trace_id: @trace_id }
      end

      # Apply input masking if needed
      forwarded_messages = if input_decision[:masked]
        mask_messages(request_messages, input_decision[:mask_keywords], input_decision[:mask_replacement])
      else
        request_messages
      end

      # Stream from provider with periodic output rule evaluation
      accumulated_text = ""
      last_eval_at = 0
      violated = false
      violation_reasons = []

      provider = Providers::Factory.build(
        provider: @request_payload[:provider],
        model: @request_payload[:model],
        options: @request_payload[:options] || {},
        base_url: @project&.upstream_base_url,
        api_key: @project&.encrypted_upstream_key
      )

      provider.stream(messages: forwarded_messages) do |content, raw_data|
        accumulated_text += content

        # Periodic output rule evaluation
        if output_rules.any? && (accumulated_text.length - last_eval_at) >= EVAL_INTERVAL
          last_eval_at = accumulated_text.length
          output_decision = Evaluator.call(
            rules: output_rules,
            content: accumulated_text,
            options: @request_payload[:options] || {}
          )

          if output_decision[:blocked]
            violated = true
            violation_reasons = output_decision[:reasons]
            break
          end
        end

        # Relay chunk to client
        block.call(:chunk, raw_data)
      end

      # Final output rule check on complete text
      unless violated
        if output_rules.any?
          output_decision = Evaluator.call(
            rules: output_rules,
            content: accumulated_text,
            options: @request_payload[:options] || {}
          )

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

    private

    def composed_rules(resolved_sets)
      resolved_sets.flat_map do |rs|
        rs[:policy_version].rules.enabled.map { |rule| [rs[:policy_set], rule] }
      end
        .sort_by { |set, rule| [set.priority, rule.priority] }
        .map(&:last)
    end

    def request_messages
      @request_payload[:messages]
    end

    def combined_input
      request_messages.map { |m| m[:content] }.join("\n")
    end

    def environment
      @request_payload[:environment]
    end

    def mask_messages(messages, keywords, replacement = "[REDACTED]")
      messages.map do |msg|
        msg.merge(content: Masker.mask(msg[:content].to_s, keywords: keywords, replacement: replacement))
      end
    end
  end
end
