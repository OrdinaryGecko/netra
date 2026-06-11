module Guardrails
  class PolicyResolver
    def self.call!(client_application:, environment:, project: nil)
      scope = project ? project.policy_sets : client_application.policy_sets
      policy_sets = scope
        .where(environment:, active: true, enabled: true)
        .includes(policy_versions: :rules)
        .order(:priority)

      raise PolicyNotFoundError, "no active policy set configured for #{environment}" if policy_sets.empty?

      policy_sets.filter_map do |ps|
        active_version = ps.policy_versions.find { |v| v.status == "active" }
        next unless active_version

        { policy_set: ps, policy_version: active_version }
      end.tap do |results|
        raise PolicyNotFoundError, "no active policy version for #{environment}" if results.empty?
      end
    end
  end
end
