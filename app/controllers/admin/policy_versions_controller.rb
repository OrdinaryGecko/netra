module Admin
  class PolicyVersionsController < BaseController
    before_action :set_policy_version, only: %i[show update publish clone dry_run]

    def show
      @policy_set = @policy_version.policy_set
      @dry_run_payload = JSON.pretty_generate(default_dry_run_payload)
      @comparison = Admin::PolicyVersionComparison.new(
        current_version: @policy_version,
        baseline_version: comparison_baseline
      )
    end

    def create
      policy_set = current_client_application.policy_sets.find(policy_version_params[:policy_set_id])
      policy_version = policy_set.policy_versions.new(
        version: policy_version_params[:version],
        status: policy_version_params[:status].presence || "draft",
        definition: parse_json_field!(policy_version_params[:definition_json], "definition")
      )

      if policy_version.save
        redirect_to admin_policy_version_path(policy_version), notice: "Draft policy version created."
      else
        redirect_to admin_policy_set_path(policy_set), alert: policy_version.errors.full_messages.to_sentence
      end
    rescue Guardrails::ValidationError => e
      redirect_to admin_policy_set_path(policy_set), alert: e.errors.to_sentence
    end

    def update
      if @policy_version.update(
        version: policy_version_update_params[:version].presence || @policy_version.version,
        definition: parse_json_field!(policy_version_update_params[:definition_json], "definition", default: @policy_version.definition)
      )
        redirect_to admin_policy_version_path(@policy_version), notice: "Policy version updated."
      else
        redirect_to admin_policy_version_path(@policy_version), alert: @policy_version.errors.full_messages.to_sentence
      end
    rescue Guardrails::ValidationError => e
      redirect_to admin_policy_version_path(@policy_version), alert: e.errors.to_sentence
    end

    def publish
      @policy_version.publish!
      redirect_to admin_policy_version_path(@policy_version), notice: "Policy version published."
    rescue ActiveRecord::RecordInvalid => e
      redirect_to admin_policy_version_path(@policy_version), alert: e.record.errors.full_messages.to_sentence.presence || e.message
    end

    def clone
      cloned = @policy_version.clone_to_draft!(
        version: clone_params[:version],
        definition: parse_json_field!(clone_params[:definition_json], "definition", default: @policy_version.definition)
      )
      redirect_to admin_policy_version_path(cloned), notice: "Draft cloned from policy version #{@policy_version.version}."
    rescue Guardrails::ValidationError, ActiveRecord::RecordInvalid => e
      message = e.is_a?(ActiveRecord::RecordInvalid) ? e.record.errors.full_messages.to_sentence : e.errors.to_sentence
      redirect_to admin_policy_version_path(@policy_version), alert: message
    end

    def dry_run
      payload = parse_json_field!(params.dig(:dry_run, :payload_json), "dry run payload", default: default_dry_run_payload)
      @result = Guardrails::PolicyVersionTester.call(
        policy_version: @policy_version,
        request_payload: payload.deep_symbolize_keys
      )

      render partial: "dry_run_frame", locals: { result: @result }
    rescue Guardrails::ValidationError => e
      render partial: "dry_run_frame", locals: { result: nil, errors: e.errors }, status: :unprocessable_entity
    end

    private

    def set_policy_version
      @policy_version = PolicyVersion.includes(:rules, :policy_set).joins(:policy_set)
        .where(policy_sets: { client_application_id: current_client_application.id })
        .find(params[:id])
    end

    def policy_version_params
      params.require(:policy_version).permit(:policy_set_id, :version, :status, :definition_json)
    end

    def policy_version_update_params
      params.require(:policy_version).permit(:version, :definition_json)
    end

    def clone_params
      params.fetch(:policy_version, {}).permit(:version, :definition_json)
    end

    def default_dry_run_payload
      {
        provider: "stub",
        model: "stub-v1",
        messages: [
          {
            role: "user",
            content: "Summarize the current policy behavior in JSON."
          }
        ],
        options: {
          expected_output: {
            format: "json_object"
          }
        }
      }
    end

    def comparison_baseline
      return active_comparison_version if active_comparison_version

      @policy_set.policy_versions.where.not(id: @policy_version.id).order(created_at: :desc).first
    end

    def active_comparison_version
      @active_comparison_version ||= @policy_set.policy_versions.find_by(status: "active")
      return nil if @active_comparison_version == @policy_version

      @active_comparison_version
    end
  end
end
