module V1
  module Admin
    class BaseController < V1::BaseController
      include Authorizable
      before_action :authenticate_user!

      private

      def current_project
        @current_project ||= begin
          project_id = request.headers["X-Netra-Project-Id"].to_s.presence
          project_id ? Project.find_by(id: project_id) : Project.first
        end
      end

      def current_client_application
        current_project&.client_applications&.first
      end
    end
  end
end
