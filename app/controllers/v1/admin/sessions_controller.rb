module V1
  module Admin
    class SessionsController < V1::BaseController
      before_action :authenticate_admin_api_key!, only: :show

      def show
        render json: {
          authenticated: true,
          api_key: {
            id: Current.api_key.id,
            name: Current.api_key.name
          },
          client_application: {
            id: Current.api_key.client_application.id,
            name: Current.api_key.client_application.name,
            key: Current.api_key.client_application.key
          },
          project: serialize_project(Current.project)
        }
      end

      def create
        api_key = ApiKey.authenticate(params[:api_key].to_s)

        unless api_key&.admin?
          render_error("unauthorized", status: :unauthorized, details: ["The provided API key is not an admin key."])
          return
        end

        reset_session
        session[:admin_api_key_id] = api_key.id
        Current.api_key = api_key

        render json: {
          authenticated: true,
          api_key: {
            id: api_key.id,
            name: api_key.name
          },
          client_application: {
            id: api_key.client_application.id,
            name: api_key.client_application.name,
            key: api_key.client_application.key
          },
          project: serialize_project(api_key.project_context)
        }, status: :created
      end

      def destroy
        reset_session
        head :no_content
      end

      private

      def serialize_project(project)
        return nil unless project

        {
          id: project.id,
          name: project.name,
          key: project.key,
          default_environment: project.default_environment,
          organization: {
            id: project.organization.id,
            name: project.organization.name,
            slug: project.organization.slug
          }
        }
      end
    end
  end
end
