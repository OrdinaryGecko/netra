module V1
  module Admin
    class RulesController < Admin::BaseController
      def create
        policy_version = policy_versions_scope.find(rule_params[:policy_version_id])
        rule = policy_version.rules.new(rule_params.except(:policy_version_id))

        if rule.save
          render json: rule.as_json, status: :created
        else
          render_error("invalid_rule", status: :unprocessable_entity, details: rule.errors.full_messages)
        end
      end

      def update
        rule = rules_scope.find(params[:id])

        if rule.update(rule_params.except(:policy_version_id))
          render json: rule.as_json, status: :ok
        else
          render_error("invalid_rule", status: :unprocessable_entity, details: rule.errors.full_messages)
        end
      end

      def destroy
        rule = rules_scope.find(params[:id])
        rule.destroy!

        head :no_content
      rescue ActiveRecord::RecordNotDestroyed => e
        render_error("invalid_rule", status: :unprocessable_entity, details: e.record.errors.full_messages)
      end

      private

      def rule_params
        params.require(:rule).permit(:policy_version_id, :name, :kind, :stage, :action, :priority, :enabled, config: {})
      end

      def rules_scope
        Rule.joins(policy_version: :policy_set).where(policy_versions: { policy_set_id: current_client_application.policy_set_ids })
      end

      def policy_versions_scope
        PolicyVersion.where(policy_set_id: current_client_application.policy_set_ids)
      end
    end
  end
end
