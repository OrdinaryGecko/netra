module Guardrails
  module PipelineBase
    extend ActiveSupport::Concern

    private

    def resolve_rules
      resolved_sets = PolicyResolver.call!(
        client_application: @client_application,
        project: @project,
        environment: environment
      )

      all_rules = composed_rules(resolved_sets)
      @input_rules = all_rules.select { |r| r.stage == "input" }
      @output_rules = all_rules.select { |r| r.stage == "output" }
      @policy_versions = resolved_sets.map { |rs| rs[:policy_version] }
    end

    def evaluate_input
      Evaluator.call(
        rules: @input_rules,
        content: combined_input,
        options: options,
        messages: request_messages,
        context: evaluation_context
      )
    end

    def apply_input_masking(decision)
      if decision[:masked]
        mask_messages(request_messages, decision[:mask_keywords], decision[:mask_replacement])
      else
        request_messages
      end
    end

    def build_provider
      Providers::Factory.build(
        provider: @request_payload[:provider],
        model: @request_payload[:model],
        options: options,
        base_url: @project&.upstream_base_url,
        api_key: @project&.upstream_key
      )
    end

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

    def options
      @request_payload[:options] || {}
    end

    def evaluation_context
      {
        project: @project,
        environment:
      }
    end

    def mask_messages(messages, keywords, replacement = "[REDACTED]")
      messages.map do |msg|
        msg.merge(content: Masker.mask(msg[:content].to_s, keywords: keywords, replacement: replacement))
      end
    end
  end
end
