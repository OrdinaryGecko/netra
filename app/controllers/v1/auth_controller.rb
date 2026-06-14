module V1
  class AuthController < V1::BaseController
    skip_forgery_protection
    before_action :authenticate_user!, only: [:logout, :me, :update_profile, :update_password]

    def login
      user = User.find_by(email: params[:email])

      unless user&.authenticate(params[:password])
        return render json: { error: "invalid_credentials", details: ["Invalid email or password"] }, status: :unauthorized
      end

      org_slug = params[:org_slug].to_s.strip
      if org_slug.present?
        organization = Organization.find_by(slug: org_slug)
        unless organization
          return render json: { error: "invalid_organization", details: ["Organization not found"] }, status: :unauthorized
        end

        membership = user.memberships.find_by(organization: organization)
        unless membership
          return render json: { error: "not_a_member", details: ["You are not a member of this organization"] }, status: :unauthorized
        end
      end

      session, token = Session.create_for_user!(user, request: request)

      render json: {
        token: token,
        user: serialize_user(user, org_slug: org_slug.presence),
        expires_at: session.expires_at
      }, status: :created
    end

    def logout
      current_session&.destroy
      head :no_content
    end

    def me
      org_slug = request.headers["X-Netra-Org-Slug"].to_s.presence
      render json: { user: serialize_user(current_user, org_slug: org_slug) }
    end

    def update_profile
      if current_user.update(profile_params)
        render json: { user: serialize_user(current_user) }
      else
        render json: { error: "invalid_profile", details: current_user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update_password
      unless current_user.authenticate(params[:current_password].to_s)
        return render json: { error: "invalid_password", details: ["Current password is incorrect"] }, status: :unprocessable_entity
      end

      if current_user.update(password: params[:new_password])
        render json: { user: serialize_user(current_user) }
      else
        render json: { error: "invalid_password", details: current_user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def forgot_password
      user = User.find_by(email: params[:email].to_s.strip.downcase)

      if user
        token = PasswordResetToken.generate_for_user!(user)
        UserMailer.password_reset(user: user, token: token).deliver_later
      end

      # Always return success to avoid email enumeration
      render json: { message: "If an account exists with that email, a reset link has been sent." }
    end

    def reset_password
      record = PasswordResetToken.find_by_token(params[:token].to_s)

      if record.nil? || record.expired? || record.used?
        return render json: { error: "invalid_token", details: ["Reset token is invalid or expired"] }, status: :unprocessable_entity
      end

      if record.user.update(password: params[:new_password])
        record.use!
        render json: { message: "Password has been reset successfully." }
      else
        render json: { error: "invalid_password", details: record.user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def profile_params
      params.permit(:name, :email)
    end

    def serialize_user(user, org_slug: nil)
      membership = if org_slug.present?
        user.memberships.includes(:organization).find_by(organizations: { slug: org_slug })
      else
        user.memberships.includes(:organization).first
      end

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
