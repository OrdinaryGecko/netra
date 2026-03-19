module V1
  module Admin
    class PolicySetsController < BaseController
      def index
        policy_sets = PolicySet.includes(:policy_versions).order(:name)
        render json: policy_sets.as_json(include: { policy_versions: { only: %i[id version status published_at] } })
      end

      def show
        policy_set = PolicySet.includes(policy_versions: :rules).find(params[:id])
        render json: policy_set.as_json(
          include: {
            policy_versions: {
              include: { rules: {} }
            }
          }
        )
      end

      def create
        policy_set = PolicySet.new(policy_set_params)

        if policy_set.save
          render json: policy_set.as_json, status: :created
        else
          render_error("invalid_policy_set", status: :unprocessable_entity, details: policy_set.errors.full_messages)
        end
      end

      def update
        policy_set = PolicySet.find(params[:id])

        if policy_set.update(policy_set_params)
          render json: policy_set.as_json, status: :ok
        else
          render_error("invalid_policy_set", status: :unprocessable_entity, details: policy_set.errors.full_messages)
        end
      end

      private

      def policy_set_params
        params.require(:policy_set).permit(:client_application_id, :name, :environment, :active)
      end
    end
  end
end
