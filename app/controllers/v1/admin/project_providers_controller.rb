module V1
  module Admin
    class ProjectProvidersController < Admin::BaseController
      before_action -> { authorize!(:edit_project) }, only: [:create, :update, :destroy]

      def index
        project = current_project
        project_providers = project.project_providers.includes(:provider).order(is_default: :desc)
        render json: project_providers.map { |pp| serialize_project_provider(pp) }
      end

      def create
        project = current_project
        project_provider = project.project_providers.new(project_provider_params)

        if project_provider.save
          render json: serialize_project_provider(project_provider), status: :created
        else
          render_error("invalid_project_provider", status: :unprocessable_entity, details: project_provider.errors.full_messages)
        end
      end

      def update
        project = current_project
        project_provider = project.project_providers.find(params[:id])

        if project_provider.update(project_provider_params)
          render json: serialize_project_provider(project_provider)
        else
          render_error("invalid_project_provider", status: :unprocessable_entity, details: project_provider.errors.full_messages)
        end
      end

      def destroy
        project = current_project
        project_provider = project.project_providers.find(params[:id])

        if project_provider.is_default?
          render_error("cannot_delete_default", status: :unprocessable_entity, details: ["Cannot delete the default provider. Set another provider as default first."])
        else
          project_provider.destroy
          head :no_content
        end
      end

      private

      def serialize_project_provider(project_provider)
        {
          id: project_provider.id,
          provider_id: project_provider.provider_id,
          provider_name: project_provider.provider.name,
          provider_type: project_provider.provider.provider_type,
          is_default: project_provider.is_default,
          environment: project_provider.environment,
          default_model: project_provider.default_model,
          created_at: project_provider.created_at,
          updated_at: project_provider.updated_at
        }
      end

      def project_provider_params
        params.require(:project_provider).permit(:provider_id, :is_default, :environment, :default_model)
      end

      def current_project
        @current_project ||= Project.find(params[:project_id])
      end
    end
  end
end
