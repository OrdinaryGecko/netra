module Guardrails
  class PolicyResolver
    def self.call!(client_application:, environment:)
      policy_set = client_application.policy_sets.find_by!(environment:, active: true)
      policy_version = policy_set.active_version

      raise PolicyNotFoundError, "no active policy version for #{environment}" unless policy_version

      policy_version
    rescue ActiveRecord::RecordNotFound
      raise PolicyNotFoundError, "no policy set configured for #{environment}"
    end
  end
end
