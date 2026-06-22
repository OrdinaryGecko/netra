module Guardrails
  class AiClassifierEvaluator
    DEFAULT_MODEL = "gpt-4o-mini".freeze

    def self.call(rule:, content:, context:)
      new(rule:, content:, context:).call
    end

    def initialize(rule:, content:, context:)
      @rule = rule
      @content = content.to_s
      @context = context || {}
      @config = rule.config || {}
    end

    def call
      classifier = AiClassifierRegistry.find(@config["classifier"])
      return failed("unsupported_classifier", "Classifier is not supported") unless classifier

      response = provider.complete(messages: messages_for(classifier))
      parsed = parse_response(response[:content])
      verdict = parsed["verdict"].to_s

      unless %w[matched clean].include?(verdict)
        return failed("invalid_verdict", "Classifier returned an invalid verdict", provider_response: response)
      end

      details = {
        classifier: classifier.id,
        classifier_name: classifier.name,
        verdict:,
        confidence: parsed["confidence"],
        rationale: parsed["rationale"].to_s.truncate(500),
        judge_provider: response[:provider],
        judge_model: response[:model]
      }.compact

      [verdict == "matched" ? "matched" : "clean", details]
    rescue JSON::ParserError => e
      failed("invalid_json", e.message)
    rescue ProviderError => e
      failed("provider_error", e.message)
    end

    private

    def provider
      project_provider = project&.default_project_provider_for(environment)
      raise ProviderError, "No provider configured for the #{environment} environment. Set one in project settings." unless project_provider

      resolved_provider = project_provider.provider
      model = project_provider.default_model.presence || resolved_provider.default_model.presence || DEFAULT_MODEL

      Providers::Factory.build(
        provider: resolved_provider.provider_type,
        model:,
        options: { expected_output: { format: "json_object" }, temperature: 0 },
        base_url: resolved_provider.base_url,
        api_key: resolved_provider.api_key
      )
    end

    def messages_for(classifier)
      [
        {
          role: "system",
          content: <<~PROMPT.squish
            You are Netra's guardrail classifier. Classify the provided content only for this policy: #{classifier.instructions}
            Return only JSON with keys verdict, confidence, and rationale.
            verdict must be "matched" when the policy is violated, otherwise "clean".
            confidence must be a number from 0 to 1. rationale must be concise and must not quote sensitive content at length.
          PROMPT
        },
        {
          role: "user",
          content: @content
        }
      ]
    end

    def parse_response(content)
      JSON.parse(content.to_s)
    end

    def failed(code, message, provider_response: nil)
      details = {
        classifier: @config["classifier"],
        error: code,
        message:,
        judge_provider: provider_response&.dig(:provider),
        judge_model: provider_response&.dig(:model)
      }.compact

      @rule.action == "block" ? ["matched", details] : ["clean", details]
    end

    def project
      @context[:project]
    end

    def environment
      @context[:environment].presence || "development"
    end
  end
end
