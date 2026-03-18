module Providers
  class StubAdapter
    def initialize(model:, options:)
      @model = model
      @options = options
    end

    def complete(messages:)
      content = if expects_json?
        { response: messages.last[:content].to_s.truncate(200) }.to_json
      else
        "stub-response: #{messages.last[:content]}"
      end

      {
        provider: "stub",
        model: @model,
        content:
      }
    end

    private

    def expects_json?
      @options.dig("expected_output", "format") == "json_object" ||
        @options.dig(:expected_output, :format) == "json_object"
    end
  end
end
