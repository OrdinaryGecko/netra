module V1
  class ConfirmationsController < Devise::ConfirmationsController
    skip_forgery_protection
    respond_to :json

    # GET /v1/auth/confirmation?confirmation_token=xxx
    def show
      self.resource = resource_class.confirm_by_token(params[:confirmation_token])
      if resource.errors.empty?
        render json: { message: "Email confirmed successfully." }
      else
        render json: { error: "invalid", details: resource.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
end
