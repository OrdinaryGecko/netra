module V1
  class BaseController < ApplicationController
    include ApiKeyAuthenticatable
    include JsonResponse

    protect_from_forgery with: :exception, unless: -> { request.headers["X-Api-Key"].present? || request.headers["Authorization"].present? }
  end
end
