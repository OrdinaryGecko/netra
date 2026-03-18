module Guardrails
  class RuleEvaluator
    def self.call(rule:, content:, options:)
      new(rule:, content:, options:).call
    end

    def initialize(rule:, content:, options:)
      @rule = rule
      @content = content.to_s
      @options = options
      @config = rule.config || {}
    end

    def call
      case @rule.kind
      when "max_message_chars"
        max = @config.fetch("max", 4_000)
        @content.length > max ? matched(length: @content.length, max:) : clean(length: @content.length, max:)
      when "keyword_blocklist"
        keywords = Array(@config["keywords"]).map(&:downcase)
        hit = keywords.find { |keyword| @content.downcase.include?(keyword) }
        hit ? matched(keyword: hit) : clean(keyword_count: keywords.size)
      when "pii_detector"
        masked = Masker.mask(@content)
        masked == @content ? clean : matched
      when "json_format"
        required = @options.dig("expected_output", "format") == "json_object" || @options.dig(:expected_output, :format) == "json_object"
        return clean(required: false) unless required

        JSON.parse(@content)
        clean(required: true)
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
