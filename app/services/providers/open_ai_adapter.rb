require "net/http"
require "uri"
require "json"

module Providers
  class OpenAiAdapter
    DEFAULT_BASE_URL = "https://api.openai.com/v1".freeze

    def initialize(model:, options:, base_url: nil, api_key: nil)
      @model = model
      @options = options
      @base_url = (base_url.presence || ENV["OPENAI_BASE_URL"].presence || DEFAULT_BASE_URL).chomp("/")
      @api_key = api_key.presence || ENV["OPENAI_API_KEY"]
    end

    def complete(messages:)
      raise Guardrails::ProviderError, "Provider API key is not configured" if @api_key.blank?

      uri = URI("#{@base_url}/chat/completions")

      request = Net::HTTP::Post.new(uri)
      request["Authorization"] = "Bearer #{@api_key}"
      request["Content-Type"] = "application/json"
      request.body = build_body(messages).to_json

      response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
        http.open_timeout = 10
        http.read_timeout = 60
        http.request(request)
      end

      parsed = JSON.parse(response.body)
      unless response.is_a?(Net::HTTPSuccess)
        error_msg = parsed.dig("error", "message") || parsed["error"].to_s.presence || "Provider request failed (#{response.code})"
        raise Guardrails::ProviderError, error_msg
      end

      {
        provider: "openai",
        model: parsed["model"] || @model,
        content: parsed.dig("choices", 0, "message", "content").to_s,
        raw: parsed
      }
    rescue JSON::ParserError => e
      raise Guardrails::ProviderError, "Invalid provider response: #{e.message}"
    rescue Net::OpenTimeout, Net::ReadTimeout => e
      raise Guardrails::ProviderError, "Provider timeout: #{e.message}"
    rescue SocketError, Errno::ECONNREFUSED => e
      raise Guardrails::ProviderError, "Provider unreachable: #{e.message}"
    end

    def stream(messages:, &block)
      raise Guardrails::ProviderError, "Provider API key is not configured" if @api_key.blank?

      uri = URI("#{@base_url}/chat/completions")
      body = build_body(messages).merge(stream: true)

      request = Net::HTTP::Post.new(uri)
      request["Authorization"] = "Bearer #{@api_key}"
      request["Content-Type"] = "application/json"
      request.body = body.to_json

      Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
        http.open_timeout = 10
        http.read_timeout = 60

        http.request(request) do |response|
          unless response.is_a?(Net::HTTPSuccess)
            body = response.read_body
            parsed = JSON.parse(body) rescue {}
            raise Guardrails::ProviderError, parsed.dig("error", "message") || "Provider request failed (#{response.code})"
          end

          buffer = ""
          response.read_body do |chunk|
            buffer += chunk
            while (line_end = buffer.index("\n"))
              line = buffer.slice!(0, line_end + 1).strip
              next unless line.start_with?("data: ")
              data = line.sub("data: ", "")
              next if data == "[DONE]"

              parsed = JSON.parse(data) rescue next
              content = parsed.dig("choices", 0, "delta", "content")
              block.call(content, data) if content
            end
          end
        end
      end
    rescue Net::OpenTimeout, Net::ReadTimeout => e
      raise Guardrails::ProviderError, "Provider timeout: #{e.message}"
    rescue SocketError, Errno::ECONNREFUSED => e
      raise Guardrails::ProviderError, "Provider unreachable: #{e.message}"
    end

    private

    def build_body(messages)
      body = { model: @model, messages: messages }
      body[:temperature] = @options["temperature"] if @options["temperature"]
      body[:max_tokens] = @options["max_tokens"] if @options["max_tokens"]
      body[:response_format] = { type: "json_object" } if expects_json?
      body
    end

    def expects_json?
      @options.dig("expected_output", "format") == "json_object" ||
        @options.dig(:expected_output, :format) == "json_object"
    end
  end
end
