namespace :netra do
  desc "Create a new organization with owner user and stub provider"
  task :create_org => :environment do
    params = {
      email: "admin@example.com",
      password: "password"
    }

    ARGV.each do |arg|
      key, value = arg.split("=", 2)
      params[key.to_sym] = value if params.key?(key.to_sym)
    end

    unless params[:name] && params[:slug]
      puts "Usage: bin/rails netra:create_org name=\"Acme Corp\" slug=acme [email=admin@acme.com] [password=password]"
      exit 1
    end

    org = Organization.find_or_create_by!(slug: params[:slug]) do |o|
      o.name = params[:name]
    end
    puts "Organization: #{org.name} (#{org.slug})"

    Apartment::Tenant.create(params[:slug]) rescue nil

    Apartment::Tenant.switch(params[:slug]) do
      user = User.find_or_create_by!(email: params[:email]) do |u|
        u.name = params[:name]
        u.role = "owner"
        u.password = params[:password]
        u.skip_confirmation!
      end
      user.confirm unless user.confirmed?
      puts "User: #{user.email} / #{params[:password]}"

      Provider.find_or_create_by!(provider_type: "stub") do |p|
        p.name = "Stub (testing)"
        p.default_model = "stub-v1"
        p.active = true
      end
      puts "Stub provider created"
    end

    puts "Done. Visit: http://#{params[:slug]}.localhost:8080"
  end
end
