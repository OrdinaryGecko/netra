module Guardrails
  class ValidationError < StandardError
    attr_reader :errors

    def initialize(errors)
      @errors = errors
      super("invalid_request")
    end
  end
end
