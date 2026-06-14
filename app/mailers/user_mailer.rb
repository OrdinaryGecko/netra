class UserMailer < ApplicationMailer
  def password_reset(user:, token:)
    @user = user
    @token = token
    @reset_url = "#{frontend_url}/forgot-password?token=#{token}"

    mail(to: user.email, subject: "Reset your Netra password")
  end

  def member_invite(user:, organization:, inviter:, temp_password:)
    @user = user
    @organization = organization
    @inviter = inviter
    @temp_password = temp_password
    @login_url = "#{frontend_url}/sign-in"

    mail(to: user.email, subject: "You've been invited to #{organization.name} on Netra")
  end

  private

  def frontend_url
    ENV.fetch("FRONTEND_URL", "http://localhost:8080")
  end
end
