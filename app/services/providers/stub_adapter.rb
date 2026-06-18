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

    def stream(messages:, &block)
      content = if expects_json?
        { response: messages.last[:content].to_s.truncate(200) }.to_json
      else
        "stub-response: #{messages.last[:content]}"
      end

      content.split(" ").each do |word|
        chunk_data = { choices: [{ delta: { content: "#{word} " } }] }.to_json
        block.call("#{word} ", chunk_data)
      end
    end

    private

    def expects_json?
      @options.dig("expected_output", "format") == "json_object" ||
        @options.dig(:expected_output, :format) == "json_object"
    end
  end
end
