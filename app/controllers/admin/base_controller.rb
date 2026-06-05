module Admin
  class BaseController < ApplicationController
    before_action :require_admin_session
    helper_method :current_admin_api_key, :current_client_application, :current_project, :policy_sets,
      :selected_policy_set_id, :selected_policy_version_id

    private

    def require_admin_session
      return if current_admin_api_key

      redirect_to new_admin_session_path, alert: "Sign in with an admin API key to continue."
    end

    def current_admin_api_key
      @current_admin_api_key ||= ApiKey.active.find_by(
        id: session[:admin_api_key_id],
        access_level: "admin"
      )&.tap do |api_key|
        Current.api_key = api_key
        Current.project = api_key.project_context
      end
    end

    def current_client_application
      current_admin_api_key&.client_application
    end

    def current_project
      Current.project || current_client_application&.project
    end

    def policy_sets
      @policy_sets ||= current_project.policy_sets.includes(:policy_versions).order(:name)
    end

    def selected_policy_set_id
      params[:policy_set_id] || @policy_set&.id || @policy_version&.policy_set_id || params[:id]
    end

    def selected_policy_version_id
      params[:policy_version_id] || @policy_version&.id || params[:id]
    end

    def parse_json_field!(raw_value, field_name, default: {})
      return default if raw_value.blank?

      JSON.parse(raw_value)
    rescue JSON::ParserError => e
      raise Guardrails::ValidationError.new(["#{field_name} must be valid JSON: #{e.message}"])
    end
  end
end
