module V1
  module Admin
    class BaseController < V1::BaseController
      before_action :authenticate_admin!

      private

      def authenticate_admin!
        unless current_user
          render_error("unauthorized", status: :unauthorized)
          return
        end
        current_session.touch_last_active!
      end

      def current_membership
        @current_membership ||= current_user&.memberships&.find_by(organization: current_organization)
      end

      def current_organization
        @current_organization ||= begin
          org_from_membership = current_user&.memberships&.includes(:organization)&.first&.organization
          org_from_membership || current_project&.organization
        end
      end

      def current_project
        @current_project ||= begin
          project_id = request.headers["X-Netra-Project-Id"].to_s.presence
          if project_id
            current_organization&.projects&.find_by(id: project_id)
          else
            current_organization&.projects&.first
          end
        end
      end

      def current_client_application
        current_project&.client_applications&.first
      end
    end
  end
end
