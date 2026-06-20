require "test_helper"

class RequestValidatorTest < ActiveSupport::TestCase
  test "passes with valid payload" do
    payload = {
      environment: "development",
      provider: "openai",
      model: "gpt-4",
      messages: [{ role: "user", content: "hello" }]
    }

    assert_nothing_raised { Guardrails::RequestValidator.call!(payload) }
  end

  test "raises when environment missing" do
    payload = { provider: "openai", model: "gpt-4", messages: [{ role: "user", content: "hi" }] }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "environment"
  end

  test "raises when provider missing" do
    payload = { environment: "dev", model: "gpt-4", messages: [{ role: "user", content: "hi" }] }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "provider"
  end

  test "raises when model missing" do
    payload = { environment: "dev", provider: "openai", messages: [{ role: "user", content: "hi" }] }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "model"
  end

  test "raises when messages missing" do
    payload = { environment: "dev", provider: "openai", model: "gpt-4" }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "messages"
  end

  test "raises when messages is not an array" do
    payload = { environment: "dev", provider: "openai", model: "gpt-4", messages: "not an array" }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "messages"
  end

  test "raises when message missing role" do
    payload = { environment: "dev", provider: "openai", model: "gpt-4", messages: [{ content: "hi" }] }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "messages"
  end

  test "raises when message missing content" do
    payload = { environment: "dev", provider: "openai", model: "gpt-4", messages: [{ role: "user" }] }

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert_includes error.errors.first, "messages"
  end

  test "collects multiple errors" do
    payload = {}

    error = assert_raises(Guardrails::ValidationError) { Guardrails::RequestValidator.call!(payload) }
    assert error.errors.length >= 4
  end
end
