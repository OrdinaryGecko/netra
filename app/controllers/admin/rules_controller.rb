module Admin
  class RulesController < BaseController
    def create
      policy_version = accessible_policy_version(rule_params[:policy_version_id])
      rule = policy_version.rules.new(
        name: rule_params[:name],
        kind: rule_params[:kind],
        stage: rule_params[:stage],
        action: rule_params[:action],
        priority: rule_params[:priority],
        enabled: rule_params[:enabled],
        config: parse_json_field!(rule_params[:config_json], "rule config")
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

      if rule.update(
        name: rule_params[:name],
        kind: rule_params[:kind],
        stage: rule_params[:stage],
        action: rule_params[:action],
        priority: rule_params[:priority],
        enabled: rule_params[:enabled],
        config: parse_json_field!(rule_params[:config_json], "rule config", default: rule.config)
      )
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
  end
end
