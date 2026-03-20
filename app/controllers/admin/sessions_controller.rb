module Admin
  class SessionsController < ApplicationController
    def new
      redirect_to admin_policy_sets_path if current_admin_api_key
    end

    def create
      api_key = ApiKey.authenticate(params[:api_key].to_s)

      if api_key&.admin?
        reset_session
        session[:admin_api_key_id] = api_key.id
        redirect_to admin_policy_sets_path, notice: "Signed in to the admin console."
      else
        flash.now[:alert] = "The provided API key is not an admin key."
        render :new, status: :unauthorized
      end
    end

    def destroy
      reset_session
      redirect_to new_admin_session_path, notice: "Signed out."
    end

    private

    def current_admin_api_key
      @current_admin_api_key ||= ApiKey.active.find_by(
        id: session[:admin_api_key_id],
        access_level: "admin"
      )
    end
  end
end
