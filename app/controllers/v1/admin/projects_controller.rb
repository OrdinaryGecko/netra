module V1
  module Admin
    class ProjectsController < Admin::BaseController
      def index
        projects = current_organization.projects.includes(:policy_sets).order(:name)
        render json: projects.map { |project| serialize_project(project) }
      end

      def show
        project = current_organization.projects.includes(:policy_sets).find(params[:id])
        render json: serialize_project(project)
      end

      def create
        project = current_organization.projects.new(project_params)

        if project.save
          project.client_applications.create!(
            name: project.name,
            key: project.key,
            default_environment: project.default_environment,
            active: project.active
          )
          render json: serialize_project(project), status: :created
        else
          render_error("invalid_project", status: :unprocessable_entity, details: project.errors.full_messages)
        end
      end

      def update
        project = current_organization.projects.find(params[:id])

        if project.update(project_params)
          sync_client_application!(project)
          render json: serialize_project(project), status: :ok
        else
          render_error("invalid_project", status: :unprocessable_entity, details: project.errors.full_messages)
        end
      end

      private

      def serialize_project(project)
        {
          id: project.id,
          name: project.name,
          key: project.key,
          default_environment: project.default_environment,
          upstream_base_url: project.upstream_base_url,
          upstream_provider: project.upstream_provider,
          fail_mode: project.fail_mode,
          active: project.active,
          organization: {
            id: project.organization.id,
            name: project.organization.name,
            slug: project.organization.slug
          },
          policy_sets_count: project.policy_sets.size
        }
      end

      def project_params
        params.require(:project).permit(
          :name,
          :key,
          :default_environment,
          :upstream_base_url,
          :upstream_provider,
          :encrypted_upstream_key,
          :fail_mode,
          :active
        )
      end

      def sync_client_application!(project)
        project.client_applications.update_all(
          name: project.name,
          key: project.key,
          default_environment: project.default_environment,
          active: project.active,
          updated_at: Time.current
        )
      end
    end
  end
end
