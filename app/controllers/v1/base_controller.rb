module V1
  class BaseController < ActionController::API
    include ApiKeyAuthenticatable
    include JsonResponse
  end
end
