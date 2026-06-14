module V1
  module Admin
    class PolicySetsController < Admin::BaseController
      before_action -> { authorize!(:read_policies) }, only: [:index, :show]
      before_action -> { authorize!(:write_policies) }, only: [:create, :update]

      def index
        policy_sets = current_project.policy_sets.includes(policy_versions: :rules)
        policy_sets = policy_sets.where(environment: params[:environment]) if params[:environment].present?
        policy_sets = policy_sets.order(:name)
        render json: policy_sets.map { |policy_set| serialize_policy_set(policy_set) }
      end

      def show
        policy_set = current_project.policy_sets.includes(policy_versions: :rules).find(params[:id])
        render json: serialize_policy_set(policy_set, include_rules: true)
      end

      def create
        policy_set = current_client_application.policy_sets.new(policy_set_params)
        policy_set.project = current_project

        if policy_set.save
          render json: policy_set.as_json, status: :created
        else
          render_error("invalid_policy_set", status: :unprocessable_entity, details: policy_set.errors.full_messages)
        end
      end

      def update
        policy_set = current_project.policy_sets.find(params[:id])

        if policy_set.update(policy_set_params)
          render json: policy_set.as_json, status: :ok
        else
          render_error("invalid_policy_set", status: :unprocessable_entity, details: policy_set.errors.full_messages)
        end
      end

      private

      def serialize_policy_set(policy_set, include_rules: false)
        {
          id: policy_set.id,
          name: policy_set.name,
          environment: policy_set.environment,
          active: policy_set.active,
          enabled: policy_set.enabled,
          priority: policy_set.priority,
          policy_versions: policy_set.policy_versions
            .sort_by { |version| [version.updated_at || Time.at(0), version.created_at || Time.at(0)] }
            .reverse
            .map { |version| serialize_policy_version(version, include_rules:) }
        }
      end

      def serialize_policy_version(version, include_rules: false)
        {
          id: version.id,
          version: version.version,
          status: version.status,
          published_at: version.published_at,
          updated_at: version.updated_at,
          created_at: version.created_at,
          definition: version.definition,
          rules_count: version.rules.size
        }.tap do |payload|
          payload[:rules] = version.rules.as_json if include_rules
        end
      end

      def policy_set_params
        params.require(:policy_set).permit(:name, :environment, :active, :enabled, :priority)
      end
    end
  end
end
