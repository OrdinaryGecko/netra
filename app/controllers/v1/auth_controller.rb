module V1
  class AuthController < V1::BaseController
    skip_forgery_protection
    before_action :authenticate_user!, only: [:logout, :me]

    def login
      user = User.find_by(email: params[:email])

      unless user&.authenticate(params[:password])
        return render json: { error: "invalid_credentials", details: ["Invalid email or password"] }, status: :unauthorized
      end

      session, token = Session.create_for_user!(user, request: request)

      render json: {
        token: token,
        user: serialize_user(user),
        expires_at: session.expires_at
      }, status: :created
    end

    def logout
      current_session&.destroy
      head :no_content
    end

    def me
      render json: { user: serialize_user(current_user) }
    end

    private

    def serialize_user(user)
      membership = user.memberships.includes(:organization).first
      {
        id: user.id,
        email: user.email,
        name: user.name,
        membership: membership ? {
          id: membership.id,
          organization_id: membership.organization_id,
          organization_name: membership.organization.name,
          organization_slug: membership.organization.slug,
          role: membership.role
        } : nil
      }
    end
  end
end
