module Guardrails
  class Evaluator
    def self.call(rules:, content:, options:, provider_response: nil, messages: nil)
      new(rules:, content:, options:, provider_response:, messages:).call
    end

    def initialize(rules:, content:, options:, provider_response: nil, messages: nil)
      @rules = rules
      @content = content
      @options = options || {}
      @provider_response = provider_response
      @messages = messages
    end

    def call
      reasons = []
      masked = false
      blocked = false
      mask_keywords = []
      mask_replacement = "[REDACTED]"
      evaluations = []

      @rules.each do |rule|
        started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        scoped_content = scoped_content_for(rule)
        outcome, details = RuleEvaluator.call(rule:, content: scoped_content[:content], options: @options)
        latency_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round

        if outcome == "matched"
          reasons << rule.name
          blocked ||= rule.action == "block"
          if rule.action == "mask"
            masked = true
            if rule.kind == "keyword_detector"
              mask_keywords.concat(Array(details[:keywords]))
              mask_replacement = rule.config&.fetch("replacement", nil).presence || "[REDACTED]"
            end
          end
        end

        evaluations << {
          stage: rule.stage,
          rule_name: rule.name,
          rule_kind: rule.kind,
          outcome:,
          action: rule.action,
          details: details.merge(
            scope: scoped_content[:scope],
            provider_response: @provider_response&.slice(:provider, :model)
          ),
          latency_ms:
        }
      end

      {
        blocked:,
        masked:,
        mask_keywords: mask_keywords.uniq,
        mask_replacement:,
        reasons:,
        evaluations:
      }
    end

    private

    def scoped_content_for(rule)
      return { content: @content, scope: "output" } if @messages.nil?

      ContentScopeResolver.call(rule:, messages: @messages, fallback_content: @content)
    end
  end
end
