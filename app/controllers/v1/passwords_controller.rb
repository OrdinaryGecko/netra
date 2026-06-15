module V1
  class PasswordsController < Devise::PasswordsController
    skip_forgery_protection
    respond_to :json

    # POST /v1/auth/password (forgot - send reset email)
    def create
      self.resource = resource_class.send_reset_password_instructions(resource_params)
      # Always return success to avoid email enumeration
      render json: { message: "If an account exists, reset instructions have been sent." }
    end

    # PATCH /v1/auth/password (reset with token)
    def update
      self.resource = resource_class.reset_password_by_token(resource_params)
      if resource.errors.empty?
        render json: { message: "Password has been reset successfully." }
      else
        render json: { error: "invalid", details: resource.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
end
