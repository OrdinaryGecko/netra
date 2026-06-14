module V1
  module Admin
    class MembershipsController < Admin::BaseController
      before_action -> { authorize!(:manage_members) }

      def index
        memberships = current_organization.memberships.includes(:user).order(:created_at)
        render json: memberships.map { |m| serialize_membership(m) }
      end

      def create
        user = User.find_or_initialize_by(email: invite_params[:email].to_s.strip.downcase)
        temp_password = nil

        if user.new_record?
          user.name = invite_params[:name].presence || invite_params[:email].split("@").first
          temp_password = SecureRandom.hex(8)
          user.password = temp_password
          unless user.save
            return render_error("invalid_user", status: :unprocessable_entity, details: user.errors.full_messages)
          end
        end

        membership = current_organization.memberships.new(user: user, role: invite_params[:role] || "viewer")

        if membership.save
          if temp_password
            UserMailer.member_invite(user: user, organization: current_organization, inviter: current_user, temp_password: temp_password).deliver_later
          end
          render json: serialize_membership(membership), status: :created
        else
          render_error("invalid_membership", status: :unprocessable_entity, details: membership.errors.full_messages)
        end
      end

      def update
        membership = current_organization.memberships.find(params[:id])

        if membership.user_id == current_user.id
          return render_error("cannot_modify_self", status: :unprocessable_entity, details: ["Cannot change your own role"])
        end

        if membership.update(role: params.dig(:membership, :role))
          render json: serialize_membership(membership)
        else
          render_error("invalid_membership", status: :unprocessable_entity, details: membership.errors.full_messages)
        end
      end

      def destroy
        membership = current_organization.memberships.find(params[:id])

        if membership.user_id == current_user.id
          return render_error("cannot_modify_self", status: :unprocessable_entity, details: ["Cannot remove yourself"])
        end

        membership.destroy!
        head :no_content
      end

      private

      def invite_params
        params.require(:membership).permit(:email, :name, :role)
      end

      def serialize_membership(membership)
        {
          id: membership.id,
          role: membership.role,
          created_at: membership.created_at,
          user: {
            id: membership.user.id,
            email: membership.user.email,
            name: membership.user.name
          }
        }
      end
    end
  end
end
