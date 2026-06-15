module V1
  module Admin
    class UsersController < Admin::BaseController
      before_action -> { authorize!(:manage_members) }, except: [:me, :update_profile, :update_password]
      before_action :authenticate_user!

      def me
        render json: serialize_user(current_user)
      end

      def update_profile
        if current_user.update(params.permit(:name, :email))
          render json: serialize_user(current_user)
        else
          render_error("invalid_profile", status: :unprocessable_entity, details: current_user.errors.full_messages)
        end
      end

      def update_password
        unless current_user.valid_password?(params[:current_password].to_s)
          return render_error("invalid_password", status: :unprocessable_entity, details: ["Current password is incorrect"])
        end

        if current_user.update(password: params[:new_password])
          render json: serialize_user(current_user)
        else
          render_error("invalid_password", status: :unprocessable_entity, details: current_user.errors.full_messages)
        end
      end

      def index
        users = User.order(:created_at)
        render json: users.map { |u| serialize_user(u) }
      end

      def create
        user = User.new(user_params)
        temp_password = params.dig(:user, :password).presence || SecureRandom.hex(8)
        user.password = temp_password
        user.skip_confirmation!

        if user.save
          UserMailer.member_invite(email: user.email, name: user.name, temp_password: temp_password).deliver_later
          render json: serialize_user(user), status: :created
        else
          render_error("invalid_user", status: :unprocessable_entity, details: user.errors.full_messages)
        end
      end

      def update
        user = User.find(params[:id])

        if user.id == current_user.id
          return render_error("cannot_modify_self", status: :unprocessable_entity, details: ["Cannot change your own role"])
        end

        if user.role == "owner" && current_user.role != "owner"
          return render_error("forbidden", status: :forbidden, details: ["Only owners can modify other owners"])
        end

        new_role = params.dig(:user, :role)
        if new_role == "owner" && current_user.role != "owner"
          return render_error("forbidden", status: :forbidden, details: ["Only owners can assign the owner role"])
        end

        if user.update(user_params.except(:email, :password))
          render json: serialize_user(user)
        else
          render_error("invalid_user", status: :unprocessable_entity, details: user.errors.full_messages)
        end
      end

      def destroy
        user = User.find(params[:id])

        if user.id == current_user.id
          return render_error("cannot_modify_self", status: :unprocessable_entity, details: ["Cannot remove yourself"])
        end

        if user.role == "owner" && current_user.role != "owner"
          return render_error("forbidden", status: :forbidden, details: ["Only owners can remove other owners"])
        end

        user.destroy!
        head :no_content
      end

      private

      def user_params
        params.require(:user).permit(:email, :name, :role)
      end

      def serialize_user(user)
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          created_at: user.created_at
        }
      end
    end
  end
end
