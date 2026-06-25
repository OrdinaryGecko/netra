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

      def validate
        provider_type = params.require(:provider_type)
        base_url = params.require(:base_url)
        api_key = params[:api_key]

        # For editing: if api_key not provided, use existing provider's key
        if api_key.blank? && params[:provider_id].present?
          existing = Provider.find(params[:provider_id])
          api_key = existing.api_key
        end

        if api_key.blank?
          render json: { valid: false, error: "API key is required" }, status: :unprocessable_entity
          return
        end

        models = fetch_models_from_params(provider_type, base_url, api_key)

        render json: { valid: true, models: models }
      rescue => e
        render json: { valid: false, error: e.message }, status: :unprocessable_entity
      end

      def models
        provider = Provider.find(params[:id])

        if provider.stub?
          render json: []
          return
        end

        cached = Rails.cache.fetch("provider_models:#{provider.id}", expires_in: 1.hour) do
          fetch_models_from_provider(provider)
        end

        render json: cached
      rescue => e
        render_error("models_fetch_failed", status: :unprocessable_entity, details: [e.message])
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
        permitted = params.require(:provider).permit(:name, :provider_type, :base_url, :api_key, :default_model, :active)
        permitted.delete(:provider_type) if permitted[:provider_type].present? && request.patch?
        permitted
      end

      def fetch_models_from_provider(provider)
        fetch_models_from_params(provider.provider_type, provider.base_url, provider.api_key)
      end

      def fetch_models_from_params(provider_type, base_url, api_key)
        uri = URI("#{base_url}/models")
        request = Net::HTTP::Get.new(uri)

        if provider_type == "anthropic"
          request["x-api-key"] = api_key
          request["anthropic-version"] = "2023-06-01"
        else
          request["Authorization"] = "Bearer #{api_key}"
        end

        response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
          http.open_timeout = 10
          http.read_timeout = 30
          http.request(request)
        end

        unless response.is_a?(Net::HTTPSuccess)
          error = JSON.parse(response.body) rescue {}
          raise error.dig("error", "message") || "Failed to fetch models (#{response.code})"
        end

        parsed = JSON.parse(response.body)
        models = parsed["data"] || []

        models.map { |m|
          { id: m["id"], name: m["display_name"] || m["id"] }
        }.sort_by { |m| m[:name] }
      end
    end
  end
end
