module JsonResponse
  extend ActiveSupport::Concern

  private

  def render_error(message, status:, details: nil)
    payload = { error: message }
    payload[:details] = details if details.present?

    render json: payload, status: status
  end
end
