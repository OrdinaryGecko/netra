module Admin
  class PolicySetsController < BaseController
    def index
      if policy_sets.any?
        redirect_to admin_policy_set_path(policy_sets.first)
      else
        @policy_set = current_client_application.policy_sets.new(environment: "development", project: current_project)
      end
    end

    def show
      @policy_set = current_project.policy_sets.includes(policy_versions: :rules).find(params[:id])
      @new_policy_version = @policy_set.policy_versions.new(status: "draft")
    end

    def create
      @policy_set = current_client_application.policy_sets.new(policy_set_params)
      @policy_set.project = current_project

      if @policy_set.save
        redirect_to admin_policy_set_path(@policy_set), notice: "Policy set created."
      else
        @new_policy_version = @policy_set.policy_versions.new(status: "draft")
        flash.now[:alert] = @policy_set.errors.full_messages.to_sentence
        render :show, status: :unprocessable_entity
      end
    end

    def update
      @policy_set = current_project.policy_sets.find(params[:id])

      if @policy_set.update(policy_set_params)
        redirect_to admin_policy_set_path(@policy_set), notice: "Policy set updated."
      else
        @new_policy_version = @policy_set.policy_versions.new(status: "draft")
        flash.now[:alert] = @policy_set.errors.full_messages.to_sentence
        render :show, status: :unprocessable_entity
      end
    end

    private

    def policy_set_params
      params.require(:policy_set).permit(:name, :environment, :active)
    end
  end
end
