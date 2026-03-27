module V1
  module Admin
    class BaseController < V1::BaseController
      before_action :authenticate_admin_api_key!

      private

      def current_client_application
        Current.api_key&.client_application
      end
    end
  end
end
