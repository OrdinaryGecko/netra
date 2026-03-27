class FrontendController < ApplicationController
  def index
    @use_vite_dev_server = use_vite_dev_server?

    if @use_vite_dev_server
      render :index, layout: false
    else
      @frontend_stylesheet = built_asset("css")
      @frontend_javascript = built_asset("js")
      render :index, layout: false
    end
  end

  private

  def use_vite_dev_server?
    Rails.env.development? && ENV["FRONTEND_DEV_SERVER"] == "1"
  end

  def built_asset(extension)
    Dir.glob(Rails.root.join("public/app/assets/*.#{extension}")).sort.last
      &.sub(Rails.root.join("public").to_s, "")
  end
end
