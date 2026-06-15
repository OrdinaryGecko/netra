class UserMailer < ApplicationMailer
  def member_invite(email:, name:, temp_password:)
    @name = name
    @email = email
    @temp_password = temp_password
    @login_url = "http://#{Apartment::Tenant.current}.#{ENV.fetch('FRONTEND_HOST', 'localhost:8080')}/sign-in"

    mail(to: email, subject: "You've been invited to Netra")
  end
end
