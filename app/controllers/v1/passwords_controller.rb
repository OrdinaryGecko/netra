module V1
  class PasswordsController < Devise::PasswordsController
    skip_forgery_protection
    respond_to :json

    private

    def respond_with(resource, _opts = {})
      if resource.errors.empty?
        render json: { message: "Password reset instructions sent." }
      else
        render json: { error: "invalid", details: resource.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
end
