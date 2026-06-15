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

module TenantTestHelper
  extend ActiveSupport::Concern

  included do
    self.use_transactional_tests = false

    teardown do
      Apartment::Tenant.switch!("public")
      # Clean up tenant schemas created during tests
      (Apartment.tenant_names - ["public"]).each do |tenant|
        Apartment::Tenant.drop(tenant) rescue nil
      end
      Organization.delete_all
    end
  end

  def create_tenant!(slug = "test")
    org = Organization.find_or_create_by!(slug: slug) { |o| o.name = "#{slug.capitalize} Org" }
    begin
      Apartment::Tenant.create(slug)
    rescue Apartment::TenantExists
    end
    org
  end

  def within_tenant(slug = "test")
    create_tenant!(slug)
    Apartment::Tenant.switch(slug) { yield }
  end

  def create_owner_in_tenant!(slug = "test")
    create_tenant!(slug)
    Apartment::Tenant.switch(slug) do
      User.find_or_create_by!(email: "owner@test.com") do |u|
        u.name = "Test Owner"
        u.role = "owner"
        u.password = "password"
      end
    end
  end

  def auth_headers_for(user, slug = "test")
    token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
    { "Authorization" => "Bearer #{token}", "X-Netra-Org-Slug" => slug }
  end
end
