module V1
  class BaseController < ApplicationController
    include ApiKeyAuthenticatable
    include JsonResponse

    protect_from_forgery with: :exception, unless: -> { request.content_type&.include?("json") || request.headers["X-Api-Key"].present? || request.headers["Authorization"].present? }

    private

    def current_session
      @current_session ||= Session.find_by_token(bearer_token)&.then { |s| s.expired? ? nil : s }
    end

    def current_user
      @current_user ||= current_session&.user
    end

    def authenticate_user!
      unless current_user
        render_error("unauthorized", status: :unauthorized)
        return
      end
      current_session.touch_last_active!
    end
  end
end
