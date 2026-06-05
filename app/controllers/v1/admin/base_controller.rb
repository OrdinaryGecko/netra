module V1
  module Admin
    class BaseController < V1::BaseController
      before_action :authenticate_admin_api_key!

      private

      def current_client_application
        current_project&.client_applications&.first || Current.api_key&.client_application
      end

      def current_project
        Current.project || current_client_application&.project
      end

      def current_organization
        current_project&.organization
      end
    end
  end
end
