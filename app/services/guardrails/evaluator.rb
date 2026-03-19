module Guardrails
  class Evaluator
    def self.call(rules:, content:, options:, provider_response: nil)
      new(rules:, content:, options:, provider_response:).call
    end

    def initialize(rules:, content:, options:, provider_response: nil)
      @rules = rules
      @content = content
      @options = options || {}
      @provider_response = provider_response
    end

    def call
      reasons = []
      masked = false
      blocked = false
      evaluations = []

      @rules.each do |rule|
        started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        outcome, details = RuleEvaluator.call(rule:, content: @content, options: @options)
        latency_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round

        if outcome == "matched"
          reasons << rule.name
          blocked ||= rule.action == "block"
          masked ||= rule.action == "mask"
        end

        evaluations << {
          stage: rule.stage,
          rule_name: rule.name,
          rule_kind: rule.kind,
          outcome:,
          action: rule.action,
          details: details.merge(provider_response: @provider_response&.slice(:provider, :model)),
          latency_ms:
        }
      end

      {
        blocked:,
        masked:,
        reasons:,
        evaluations:
      }
    end
  end
end
