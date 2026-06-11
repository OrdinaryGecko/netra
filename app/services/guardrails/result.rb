module Guardrails
  class Result
    attr_reader :status, :action, :reasons, :trace_id, :policy_versions,
      :provider_response, :messages, :evaluations, :dry_run

    def initialize(status:, action:, reasons:, trace_id:, policy_versions:, provider_response:, messages:, evaluations: nil, dry_run: false)
      @status = status
      @action = action
      @reasons = reasons
      @trace_id = trace_id
      @policy_versions = policy_versions
      @provider_response = provider_response
      @messages = messages
      @evaluations = evaluations
      @dry_run = dry_run
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
        policy_versions:,
        messages:,
        provider_response:,
        dry_run:
      }.tap do |payload|
        payload[:evaluations] = evaluations if evaluations.present?
      end
    end
  end
end
