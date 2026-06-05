module Guardrails
  class PolicyResolver
    def self.call!(client_application:, environment:, project: nil)
      policy_set = if project
        project.policy_sets.find_by!(environment:, active: true)
      else
        client_application.policy_sets.find_by!(environment:, active: true)
      end
      policy_version = policy_set.active_version

      raise PolicyNotFoundError, "no active policy version for #{environment}" unless policy_version

      policy_version
    rescue ActiveRecord::RecordNotFound
      raise PolicyNotFoundError, "no policy set configured for #{environment}"
    end
  end
end
