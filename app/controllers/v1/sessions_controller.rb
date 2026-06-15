module V1
  class SessionsController < Devise::SessionsController
    skip_forgery_protection
    respond_to :json

    private

    def respond_with(resource, _opts = {})
      render json: {
        user: {
          id: resource.id,
          email: resource.email,
          name: resource.name,
          role: resource.role
        }
      }, status: :created
    end

    def respond_to_on_destroy
      head :no_content
    end
  end
end
