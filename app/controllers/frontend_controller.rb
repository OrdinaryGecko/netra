class FrontendController < ApplicationController
  def index
    built_index = Rails.root.join("public/app/index.html")

    if use_vite_dev_server?
      render :index, layout: false
    elsif built_index.exist?
      render file: built_index, layout: false, content_type: "text/html"
    else
      render :index, layout: false
    end
  end

  private

  def use_vite_dev_server?
    Rails.env.development? && ENV["FRONTEND_DEV_SERVER"] == "1"
  end
end
