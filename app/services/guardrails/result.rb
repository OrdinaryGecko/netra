module Guardrails
  class Result
    attr_reader :status, :action, :reasons, :trace_id, :policy_version,
      :provider_response, :messages

    def initialize(status:, action:, reasons:, trace_id:, policy_version:, provider_response:, messages:)
      @status = status
      @action = action
      @reasons = reasons
      @trace_id = trace_id
      @policy_version = policy_version
      @provider_response = provider_response
      @messages = messages
    end

    def http_status
      status == "blocked" ? :unprocessable_entity : :ok
    end

    def as_json(*)
      {
        status:,
        action:,
        reasons:,
        trace_id:,
        policy_version:,
        messages:,
        provider_response:
      }
    end
  end
end
