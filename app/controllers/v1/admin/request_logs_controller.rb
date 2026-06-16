module V1
  module Admin
    class RequestLogsController < Admin::BaseController
      before_action -> { authorize!(:read_logs) }

      def index
        requests = GuardrailRequest.includes(:guardrail_evaluations, :agent)
          .order(occurred_at: :desc)
          .limit(params[:limit] || 50)
          .offset(params[:offset] || 0)

        requests = requests.where(project_id: params[:project_id]) if params[:project_id].present?
        requests = requests.where(status: params[:status]) if params[:status].present?
        requests = requests.where(environment: params[:environment]) if params[:environment].present?

        total = GuardrailRequest.then { |scope|
          scope = scope.where(project_id: params[:project_id]) if params[:project_id].present?
          scope = scope.where(status: params[:status]) if params[:status].present?
          scope = scope.where(environment: params[:environment]) if params[:environment].present?
          scope.count
        }

        render json: {
          requests: requests.map { |r| serialize_request(r) },
          total: total
        }
      end

      def show
        request_record = GuardrailRequest.includes(:guardrail_evaluations).find(params[:id])
        render json: serialize_request(request_record, include_details: true)
      end

      private

      def serialize_request(req, include_details: false)
        {
          id: req.id,
          trace_id: req.trace_id,
          environment: req.environment,
          provider: req.provider,
          model: req.model,
          status: req.status,
          action: req.decision["action"],
          reasons: req.decision["reasons"] || [],
          agent: req.agent&.identifier,
          occurred_at: req.occurred_at,
          evaluations_count: req.guardrail_evaluations.size
        }.tap do |payload|
          if include_details
            payload[:messages] = req.messages
            payload[:response_payload] = req.response_payload
            payload[:decision] = req.decision
            payload[:request_metadata] = req.request_metadata
            payload[:evaluations] = req.guardrail_evaluations.map { |e| serialize_evaluation(e) }
          end
        end
      end

      def serialize_evaluation(eval)
        {
          id: eval.id,
          stage: eval.stage,
          rule_name: eval.rule_name,
          rule_kind: eval.rule_kind,
          outcome: eval.outcome,
          action: eval.action,
          details: eval.details,
          latency_ms: eval.latency_ms
        }
      end
    end
  end
end
