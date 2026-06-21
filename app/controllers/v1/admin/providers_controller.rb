module V1
  module Admin
    class ProvidersController < Admin::BaseController
      before_action -> { authorize!(:manage_projects) }, only: [:create, :update, :destroy]

      def index
        providers = Provider.all.order(:name)
        render json: providers.map { |p| serialize_provider(p) }
      end

      def show
        provider = Provider.find(params[:id])
        render json: serialize_provider(provider)
      end

      def create
        provider = Provider.new(provider_params)

        if provider.save
          render json: serialize_provider(provider), status: :created
        else
          render_error("invalid_provider", status: :unprocessable_entity, details: provider.errors.full_messages)
        end
      end

      def update
        provider = Provider.find(params[:id])

        if provider.update(provider_params)
          render json: serialize_provider(provider)
        else
          render_error("invalid_provider", status: :unprocessable_entity, details: provider.errors.full_messages)
        end
      end

      def destroy
        provider = Provider.find(params[:id])

        if provider.stub?
          render_error("cannot_delete_stub", status: :unprocessable_entity, details: ["Cannot delete the stub provider"])
        elsif provider.projects.exists?
          render_error("provider_in_use", status: :unprocessable_entity, details: ["Provider is in use by projects"])
        else
          provider.destroy
          head :no_content
        end
      end

      private

      def serialize_provider(provider)
        {
          id: provider.id,
          name: provider.name,
          provider_type: provider.provider_type,
          base_url: provider.base_url,
          default_model: provider.default_model,
          active: provider.active,
          created_at: provider.created_at,
          updated_at: provider.updated_at
        }
      end

      def provider_params
        params.require(:provider).permit(:name, :provider_type, :base_url, :api_key, :default_model, :active)
      end
    end
  end
end
