ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end

module AdminAuthHelper
  def create_admin_user!(organization: nil)
    org = organization || Organization.find_or_create_by!(slug: "test") { |o| o.name = "Test Org" }
    user = User.find_or_create_by!(email: "test@netra.local") do |u|
      u.name = "Test Admin"
      u.password = "password"
    end
    Membership.find_or_create_by!(user: user, organization: org) { |m| m.role = "owner" }
    [user, org]
  end

  def admin_session_headers(user = nil)
    user ||= create_admin_user!.first
    _session, token = Session.create_for_user!(user)
    { "Authorization" => "Bearer #{token}" }
  end
end
