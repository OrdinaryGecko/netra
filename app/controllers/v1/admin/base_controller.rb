module V1
  module Admin
    class BaseController < V1::BaseController
      before_action :authenticate_admin_api_key!
    end
  end
end
