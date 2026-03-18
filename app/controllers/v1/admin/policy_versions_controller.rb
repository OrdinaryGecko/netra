module V1
  module Admin
    class PolicyVersionsController < BaseController
      def publish
        policy_version = PolicyVersion.find(params[:id])
        policy_version.publish!

        render json: policy_version.as_json, status: :ok
      end
    end
  end
end
