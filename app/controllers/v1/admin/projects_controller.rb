module V1
  module Admin
    class ProjectsController < Admin::BaseController
      before_action -> { authorize!(:read_policies) }, only: [:index, :show]
      before_action -> { authorize!(:manage_projects) }, only: [:create]
      before_action -> { authorize!(:edit_project) }, only: [:update]
      before_action -> { authorize!(:dry_run) }, only: [:dry_run]

      def index
        projects = Project.includes(:policy_sets).order(:name)
        render json: projects.map { |project| serialize_project(project) }
      end

      def show
        project = Project.includes(:policy_sets).find(params[:id])
        render json: serialize_project(project)
      end

      def create
        project = Project.new(project_params)

        if project.save
          project.client_applications.create!(
            name: project.name,
            key: project.key,
            active: project.active
          )

          project.link_stub_providers!

          render json: serialize_project(project), status: :created
        else
          render_error("invalid_project", status: :unprocessable_entity, details: project.errors.full_messages)
        end
      end

      def update
        project = Project.find(params[:id])

        if project.update(project_params)
          sync_client_application!(project)
          render json: serialize_project(project), status: :ok
        else
          render_error("invalid_project", status: :unprocessable_entity, details: project.errors.full_messages)
        end
      end

      def dry_run
        project = Project.find(params[:id])
        client_application = project.client_applications.first
        environment = params[:environment].presence || "development"

        result = Guardrails::PolicyVersionTester.call_for_project(
          project:,
          client_application:,
          environment:,
          request_payload: test_params.to_h.deep_symbolize_keys
        )

        render json: result.as_json, status: :ok
      rescue Guardrails::ValidationError => e
        render_error("invalid_request", status: :unprocessable_entity, details: e.errors)
      rescue Guardrails::PolicyNotFoundError => e
        render_error("no_active_policy", status: :unprocessable_entity, details: [e.message])
      rescue Guardrails::ProviderError => e
        render_error("provider_error", status: :unprocessable_entity, details: [e.message])
      rescue ActiveRecord::RecordInvalid => e
        render_error("invalid_project", status: :unprocessable_entity, details: e.record.errors.full_messages)
      end

      private

      def serialize_project(project)
        {
          id: project.id,
          name: project.name,
          key: project.key,
          active: project.active,
          policy_sets_count: project.policy_sets.size
        }
      end

      def project_params
        params.require(:project).permit(
          :name,
          :key,
          :active
        )
      end

      def sync_client_application!(project)
        project.client_applications.update_all(
          name: project.name,
          key: project.key,
          active: project.active,
          updated_at: Time.current
        )
      end

      def test_params
        params.permit(
          :environment,
          messages: %i[role content]
        )
      end
    end
  end
end
