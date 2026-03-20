module Admin
  class RulesController < BaseController
    def create
      attributes = permitted_rule_attributes
      policy_version = accessible_policy_version(rule_params[:policy_version_id])
      rule = policy_version.rules.new(
        name: attributes[:name],
        kind: attributes[:kind],
        stage: attributes[:stage],
        action: attributes[:action],
        priority: attributes[:priority],
        enabled: boolean_param(attributes[:enabled], default: true),
        config: parse_json_field!(attributes[:config_json], "rule config")
      )

      if rule.save
        redirect_to admin_policy_version_path(policy_version), notice: "Rule created."
      else
        redirect_to admin_policy_version_path(policy_version), alert: rule.errors.full_messages.to_sentence
      end
    rescue Guardrails::ValidationError => e
      redirect_to admin_policy_version_path(policy_version), alert: e.errors.to_sentence
    end

    def update
      rule = accessible_rule(params[:id])
      policy_version = rule.policy_version
      attributes = permitted_rule_attributes

      if rule.update(rule_update_attributes(rule, attributes))
        redirect_to admin_policy_version_path(policy_version), notice: "Rule updated."
      else
        redirect_to admin_policy_version_path(policy_version), alert: rule.errors.full_messages.to_sentence
      end
    rescue Guardrails::ValidationError => e
      redirect_to admin_policy_version_path(policy_version), alert: e.errors.to_sentence
    end

    def destroy
      rule = accessible_rule(params[:id])
      policy_version = rule.policy_version
      rule.destroy!
      redirect_to admin_policy_version_path(policy_version), notice: "Rule deleted."
    rescue ActiveRecord::RecordNotDestroyed => e
      redirect_to admin_policy_version_path(policy_version), alert: e.record.errors.full_messages.to_sentence
    end

    private

    def rule_params
      params.require(:rule).permit(:policy_version_id, :name, :kind, :stage, :action, :priority, :enabled, :config_json)
    end

    def accessible_policy_version(id)
      PolicyVersion.joins(:policy_set)
        .where(policy_sets: { client_application_id: current_client_application.id })
        .find(id)
    end

    def accessible_rule(id)
      Rule.joins(policy_version: :policy_set)
        .where(policy_sets: { client_application_id: current_client_application.id })
        .find(id)
    end

    def permitted_rule_attributes
      rule_params.to_h.symbolize_keys
    end

    def rule_update_attributes(rule, attributes)
      {
        name: attributes.fetch(:name, rule.name),
        kind: attributes.fetch(:kind, rule.kind),
        stage: attributes.fetch(:stage, rule.stage),
        action: attributes.fetch(:action, rule.action),
        priority: attributes.fetch(:priority, rule.priority),
        enabled: boolean_param(attributes[:enabled], default: rule.enabled),
        config: parse_json_field!(attributes[:config_json], "rule config", default: rule.config)
      }
    end

    def boolean_param(value, default:)
      return default if value.nil?

      ActiveModel::Type::Boolean.new.cast(value)
    end
  end
end
