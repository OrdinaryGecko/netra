module Guardrails
  class RuleEvaluator
    def self.call(rule:, content:, options:, context: {})
      new(rule:, content:, options:, context:).call
    end

    def initialize(rule:, content:, options:, context: {})
      @rule = rule
      @content = content.to_s
      @options = options
      @context = context
      @config = rule.config || {}
    end

    def call
      case @rule.kind
      when "max_message_chars"
        max = @config.fetch("max", 4_000)
        @content.length > max ? matched(length: @content.length, max:) : clean(length: @content.length, max:)
      when "keyword_detector"
        keywords = Array(@config["keywords"]).map(&:downcase)
        found = keywords.select { |keyword| @content.downcase.include?(keyword) }
        found.any? ? matched(keywords: found) : clean(keyword_count: keywords.size)
      when "pii_detector"
        pii_types = []
        pii_types << "email" if @content.match?(Masker::EMAIL_REGEX)
        pii_types << "phone" if @content.match?(Masker::PHONE_REGEX)
        pii_types << "ssn" if @content.match?(Masker::SSN_REGEX)

        pii_types.any? ? matched(types: pii_types) : clean(types: [])
      when "json_format"
        required = @options.dig("expected_output", "format") == "json_object" || @options.dig(:expected_output, :format) == "json_object"
        return clean(required: false) unless required

        JSON.parse(@content)
        clean(required: true)
      when "ai_classifier"
        AiClassifierEvaluator.call(rule: @rule, content: @content, context: @context)
      else
        clean(skipped: true)
      end
    rescue JSON::ParserError => e
      matched(error: e.message)
    end

    private

    def matched(details = {})
      ["matched", details]
    end

    def clean(details = {})
      ["clean", details]
    end
  end
end
