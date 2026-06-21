require "test_helper"

class RequestValidatorTest < ActiveSupport::TestCase
  test "passes with valid payload" do
    payload = {
      environment: "development",
      messages: [{ role: "user", content: "hello" }]
    }

    assert_nothing_raised { Guardrails::RequestValidator.call!(payload) }
  end

  test "raises when environment missing" do
    payload = { messages: [{ role: "user", content: "hi" }] }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "environment"
  end

  test "raises when messages missing" do
    payload = { environment: "dev" }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "messages"
  end

  test "raises when messages is not an array" do
    payload = { environment: "dev", messages: "not an array" }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "messages"
  end

  test "raises when message missing role" do
    payload = { environment: "dev", messages: [{ content: "hi" }] }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "messages"
  end

  test "raises when message missing content" do
    payload = { environment: "dev", messages: [{ role: "user" }] }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "messages"
  end

  test "collects multiple errors" do
    payload = {}

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert error.errors.length >= 2
  end
end
