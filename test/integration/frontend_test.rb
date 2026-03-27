require "test_helper"

class FrontendTest < ActionDispatch::IntegrationTest
  test "root redirects to app" do
    get "/"

    assert_redirected_to "/app"
  end

  test "app frontend route responds successfully" do
    get "/app"

    assert_response :success
    assert_match(/<div id="root"><\/div>|Netra/, response.body)
  end
end
