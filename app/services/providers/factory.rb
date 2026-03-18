module Providers
  class Factory
    def self.build(provider:, model:, options:)
      case provider
      when "stub"
        StubAdapter.new(model:, options:)
      when "openai"
        OpenAiAdapter.new(model:, options:)
      else
        raise Guardrails::ProviderError, "unsupported provider: #{provider}"
      end
    end
  end
end
