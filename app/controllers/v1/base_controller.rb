module V1
  class BaseController < ApplicationController
    include ApiKeyAuthenticatable
    include JsonResponse
  end
end
