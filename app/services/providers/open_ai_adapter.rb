require "net/http"
require "uri"
require "json"

module Providers
  class OpenAiAdapter
    OPENAI_URI = URI("https://api.openai.com/v1/chat/completions")

    def initialize(model:, options:)
      @model = model
      @options = options
    end

    def complete(messages:)
      api_key = ENV["OPENAI_API_KEY"]
      raise Guardrails::ProviderError, "OPENAI_API_KEY is not configured" if api_key.blank?

      request = Net::HTTP::Post.new(OPENAI_URI)
      request["Authorization"] = "Bearer #{api_key}"
      request["Content-Type"] = "application/json"
      request.body = {
        model: @model,
        messages: messages
      }.to_json

      response = Net::HTTP.start(OPENAI_URI.hostname, OPENAI_URI.port, use_ssl: true) do |http|
        http.request(request)
      end

      parsed = JSON.parse(response.body)
      unless response.is_a?(Net::HTTPSuccess)
        raise Guardrails::ProviderError, parsed["error"].to_s.presence || "OpenAI request failed"
      end

      {
        provider: "openai",
        model: @model,
        content: parsed.dig("choices", 0, "message", "content").to_s,
        raw: parsed
      }
    rescue JSON::ParserError => e
      raise Guardrails::ProviderError, "invalid OpenAI response: #{e.message}"
    end
  end
end
