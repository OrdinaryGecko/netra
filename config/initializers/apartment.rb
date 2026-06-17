require "apartment/elevators/generic"

Apartment.configure do |config|
  config.excluded_models = %w[Organization]
  config.tenant_names = -> { Organization.pluck(:slug) }
  config.default_tenant = "public"
  config.use_schemas = true
end

Rails.application.config.middleware.use Apartment::Elevators::Generic, proc { |request|
  request.env["HTTP_X_NETRA_ORG_SLUG"].presence
}

require_relative "../../lib/runtime_auth_middleware"
Rails.application.config.middleware.use RuntimeAuthMiddleware
