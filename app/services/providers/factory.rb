module Providers
  class Factory
    def self.build(provider:, model:, options:, base_url: nil, api_key: nil)
      case provider
      when "stub"
        StubAdapter.new(model:, options:)
      when "openai"
        OpenAiAdapter.new(model:, options:, base_url:, api_key:)
      else
        raise Guardrails::ProviderError, "unsupported provider: #{provider}"
      end
    end
  end
end
