module Admin
  class PolicyVersionComparison
    attr_reader :current_version, :baseline_version

    def initialize(current_version:, baseline_version:)
      @current_version = current_version
      @baseline_version = baseline_version
    end

    def available?
      baseline_version.present?
    end

    def added_rules
      @added_rules ||= current_rules.keys.difference(baseline_rules.keys).sort
    end

    def removed_rules
      @removed_rules ||= baseline_rules.keys.difference(current_rules.keys).sort
    end

    def changed_rules
      @changed_rules ||= current_rules.each_with_object([]) do |(name, signature), changes|
        baseline_signature = baseline_rules[name]
        next unless baseline_signature
        next if baseline_signature == signature

        changes << {
          name:,
          before: baseline_signature,
          after: signature
        }
      end
    end

    def unchanged_count
      shared_names = current_rules.keys & baseline_rules.keys
      shared_names.count { |name| current_rules[name] == baseline_rules[name] }
    end

    def total_changes
      added_rules.size + removed_rules.size + changed_rules.size
    end

    private

    def current_rules
      @current_rules ||= indexed_rules(current_version)
    end

    def baseline_rules
      @baseline_rules ||= indexed_rules(baseline_version)
    end

    def indexed_rules(version)
      return {} unless version

      version.rules.each_with_object({}) do |rule, index|
        index[rule.name] = {
          kind: rule.kind,
          stage: rule.stage,
          action: rule.action,
          priority: rule.priority,
          enabled: rule.enabled,
          config: rule.config
        }
      end
    end
  end
end
