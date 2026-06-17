module OpenAi
  class ChatCompletionResponse
    def initialize(result:, requested_model:)
      @result = result
      @requested_model = requested_model
    end

    def as_json(*)
      {
        id: "chatcmpl-#{@result.trace_id.delete('-').first(24)}",
        object: "chat.completion",
        created: Time.current.to_i,
        model: response_model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: response_content
            },
            finish_reason: "stop"
          }
        ],
        usage: usage_payload
      }.compact
    end

    private

    def provider_response
      @result.provider_response || {}
    end

    def response_model
      provider_response[:model] || provider_response["model"] || @requested_model
    end

    def response_content
      provider_response[:content] || provider_response["content"] || ""
    end

    def usage_payload
      raw_usage = provider_response.dig(:raw, "usage") || provider_response.dig("raw", "usage")
      return nil unless raw_usage

      {
        prompt_tokens: raw_usage["prompt_tokens"],
        completion_tokens: raw_usage["completion_tokens"],
        total_tokens: raw_usage["total_tokens"]
      }
    end
  end
end
