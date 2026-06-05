module V1
  module Admin
    class PolicyVersionsController < Admin::BaseController
      def show
        policy_version = policy_versions_scope.includes(:rules).find(params[:id])
        render json: serialize_policy_version(policy_version)
      end

      def create
        policy_set = current_project.policy_sets.find(policy_version_params[:policy_set_id])
        policy_version = policy_set.policy_versions.new(policy_version_params.except(:policy_set_id))

        if policy_version.save
          render json: serialize_policy_version(policy_version), status: :created
        else
          render_error("invalid_policy_version", status: :unprocessable_entity, details: policy_version.errors.full_messages)
        end
      end

      def update
        policy_version = policy_versions_scope.find(params[:id])

        if policy_version.update(policy_version_params.except(:policy_set_id))
          render json: serialize_policy_version(policy_version), status: :ok
        else
          render_error("invalid_policy_version", status: :unprocessable_entity, details: policy_version.errors.full_messages)
        end
      end

      def publish
        policy_version = policy_versions_scope.find(params[:id])
        policy_version.publish!

        render json: serialize_policy_version(policy_version), status: :ok
      rescue ActiveRecord::RecordInvalid => e
        render_error("invalid_policy_version", status: :unprocessable_entity, details: e.record.errors.full_messages)
      end

      def clone
        policy_version = policy_versions_scope.includes(:rules).find(params[:id])
        cloned_version = policy_version.clone_to_draft!(
          version: clone_params[:version],
          definition: clone_params[:definition]
        )

        render json: serialize_policy_version(cloned_version), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render_error("invalid_policy_version", status: :unprocessable_entity, details: e.record.errors.full_messages)
      end

      def test
        policy_version = policy_versions_scope.includes(:rules, :policy_set).find(params[:id])
        result = Guardrails::PolicyVersionTester.call(
          policy_version:,
          request_payload: test_params.to_h.deep_symbolize_keys
        )

        render json: result.as_json, status: :ok
      rescue Guardrails::ValidationError => e
        render_error("invalid_request", status: :unprocessable_entity, details: e.errors)
      rescue ActiveRecord::RecordInvalid => e
        render_error("invalid_policy_version", status: :unprocessable_entity, details: e.record.errors.full_messages)
      end

      private

      def serialize_policy_version(policy_version)
        policy_version.as_json(include: { rules: {} }).merge(
          policy_set_name: policy_version.policy_set.name,
          policy_set_environment: policy_version.policy_set.environment
        )
      end

      def policy_version_params
        params.require(:policy_version).permit(:policy_set_id, :version, :status, definition: {})
      end

      def clone_params
        params.fetch(:policy_version, {}).permit(:version, definition: {})
      end

      def test_params
        params.permit(
          :provider,
          :model,
          :execute_provider,
          options: {},
          messages: %i[role content]
        ).tap do |payload|
          payload[:environment] ||= policy_version_environment
        end
      end

      def policy_version_environment
        @policy_version_environment ||= policy_versions_scope.joins(:policy_set)
          .where(id: params[:id])
          .pick("policy_sets.environment")
      end

      def policy_versions_scope
        PolicyVersion.joins(:policy_set).where(policy_sets: { project_id: current_project.id })
      end
    end
  end
end
