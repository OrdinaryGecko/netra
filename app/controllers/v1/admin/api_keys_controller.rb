module V1
  module Admin
    class ApiKeysController < Admin::BaseController
      before_action -> { authorize!(:manage_projects) }
      before_action :set_project

      def index
        keys = @project.api_keys.where(access_level: "runtime").order(created_at: :desc)
        render json: keys.map { |k| serialize_key(k) }
      end

      def create
        client_application = @project.client_applications.first
        unless client_application
          return render_error("no_client_application", status: :unprocessable_entity, details: ["Project has no client application"])
        end

        record, plaintext = ApiKey.issue!(
          client_application: client_application,
          project: @project,
          name: params.dig(:api_key, :name).presence || "Runtime key"
        )

        render json: serialize_key(record).merge(token: plaintext), status: :created
      end

      def destroy
        key = @project.api_keys.find(params[:id])
        key.update!(active: false)
        head :no_content
      end

      private

      def set_project
        @project = Project.find(params[:project_id])
      end

      def serialize_key(key)
        {
          id: key.id,
          name: key.name,
          active: key.active,
          last_used_at: key.last_used_at,
          created_at: key.created_at,
          token_preview: "••••#{key.token_digest.last(8)}"
        }
      end
    end
  end
end
