module V1
  module Admin
    class RulesController < Admin::BaseController
      def create
        policy_version = PolicyVersion.find(rule_params[:policy_version_id])
        rule = policy_version.rules.new(rule_params.except(:policy_version_id))

        if rule.save
          render json: rule.as_json, status: :created
        else
          render_error("invalid_rule", status: :unprocessable_entity, details: rule.errors.full_messages)
        end
      end

      def update
        rule = Rule.find(params[:id])

        if rule.update(rule_params.except(:policy_version_id))
          render json: rule.as_json, status: :ok
        else
          render_error("invalid_rule", status: :unprocessable_entity, details: rule.errors.full_messages)
        end
      end

      def destroy
        rule = Rule.find(params[:id])
        rule.destroy!

        head :no_content
      rescue ActiveRecord::RecordNotDestroyed => e
        render_error("invalid_rule", status: :unprocessable_entity, details: e.record.errors.full_messages)
      end

      private

      def rule_params
        params.require(:rule).permit(:policy_version_id, :name, :kind, :stage, :action, :priority, :enabled, config: {})
      end
    end
  end
end
