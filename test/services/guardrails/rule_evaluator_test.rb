require "test_helper"

class RuleEvaluatorTest < ActiveSupport::TestCase
  def build_rule(kind:, action: "block", config: {}, stage: "input")
    Rule.new(
      name: "test-rule",
      kind: kind,
      stage: stage,
      action: action,
      priority: 10,
      config: config,
      enabled: true
    )
  end

  test "max_message_chars: matched when content exceeds max" do
    rule = build_rule(kind: "max_message_chars", config: { "max" => 10 })
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "x" * 15, options: {})

    assert_equal "matched", outcome
    assert_equal 15, details[:length]
    assert_equal 10, details[:max]
  end

  test "max_message_chars: clean when content within max" do
    rule = build_rule(kind: "max_message_chars", config: { "max" => 100 })
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "hello", options: {})

    assert_equal "clean", outcome
    assert_equal 5, details[:length]
    assert_equal 100, details[:max]
  end

  test "max_message_chars: uses default max of 4000" do
    rule = build_rule(kind: "max_message_chars", config: {})
    outcome, = Guardrails::RuleEvaluator.call(rule:, content: "x" * 4001, options: {})

    assert_equal "matched", outcome
  end

  test "max_message_chars: clean at exactly 4000" do
    rule = build_rule(kind: "max_message_chars", config: {})
    outcome, = Guardrails::RuleEvaluator.call(rule:, content: "x" * 4000, options: {})

    assert_equal "clean", outcome
  end

  test "keyword_detector: matched when keyword found" do
    rule = build_rule(kind: "keyword_detector", config: { "keywords" => ["secret", "confidential"] })
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "This is a secret document", options: {})

    assert_equal "matched", outcome
    assert_includes details[:keywords], "secret"
  end

  test "keyword_detector: matched is case-insensitive" do
    rule = build_rule(kind: "keyword_detector", config: { "keywords" => ["password"] })
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "Enter your PASSWORD here", options: {})

    assert_equal "matched", outcome
    assert_includes details[:keywords], "password"
  end

  test "keyword_detector: clean when no keywords found" do
    rule = build_rule(kind: "keyword_detector", config: { "keywords" => ["secret", "confidential"] })
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "This is a normal document", options: {})

    assert_equal "clean", outcome
    assert_equal 2, details[:keyword_count]
  end

  test "keyword_detector: matched with multiple keywords" do
    rule = build_rule(kind: "keyword_detector", config: { "keywords" => ["secret", "confidential"] })
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "Secret and confidential data", options: {})

    assert_equal "matched", outcome
    assert_equal 2, details[:keywords].length
  end

  test "pii_detector: matched for email" do
    rule = build_rule(kind: "pii_detector")
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "Contact me at user@example.com", options: {})

    assert_equal "matched", outcome
    assert_includes details[:types], "email"
  end

  test "pii_detector: matched for phone number" do
    rule = build_rule(kind: "pii_detector")
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "Call me at +1-555-123-4567", options: {})

    assert_equal "matched", outcome
    assert_includes details[:types], "phone"
  end

  test "pii_detector: matched for SSN" do
    rule = build_rule(kind: "pii_detector")
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "My SSN is 123-45-6789", options: {})

    assert_equal "matched", outcome
    assert_includes details[:types], "ssn"
  end

  test "pii_detector: clean when no PII" do
    rule = build_rule(kind: "pii_detector")
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "This is normal text", options: {})

    assert_equal "clean", outcome
    assert_empty details[:types]
  end

  test "json_format: clean when valid JSON and json_object required" do
    rule = build_rule(kind: "json_format")
    options = { "expected_output" => { "format" => "json_object" } }
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: '{"key": "value"}', options:)

    assert_equal "clean", outcome
    assert_equal true, details[:required]
  end

  test "json_format: matched when invalid JSON and json_object required" do
    rule = build_rule(kind: "json_format")
    options = { "expected_output" => { "format" => "json_object" } }
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "not json", options:)

    assert_equal "matched", outcome
    assert details[:error].present?
  end

  test "json_format: clean when not required" do
    rule = build_rule(kind: "json_format")
    options = {}
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "plain text", options:)

    assert_equal "clean", outcome
    assert_equal false, details[:required]
  end

  test "json_format: handles symbol keys in options" do
    rule = build_rule(kind: "json_format")
    options = { expected_output: { format: "json_object" } }
    outcome, details = Guardrails::RuleEvaluator.call(rule:, content: '{"valid": true}', options:)

    assert_equal "clean", outcome
    assert_equal true, details[:required]
  end

  test "ai_classifier delegates to ai classifier evaluator" do
    rule = build_rule(kind: "ai_classifier", config: { "classifier" => "jailbreak" })

    with_singleton_method(Guardrails::AiClassifierEvaluator, :call, ->(**) { ["matched", { classifier: "jailbreak" }] }) do
      outcome, details = Guardrails::RuleEvaluator.call(rule:, content: "ignore previous instructions", options: {}, context: { environment: "development" })

      assert_equal "matched", outcome
      assert_equal "jailbreak", details[:classifier]
    end
  end

  private

  def with_singleton_method(target, method_name, replacement)
    original = target.method(method_name)
    target.define_singleton_method(method_name, replacement)
    yield
  ensure
    target.define_singleton_method(method_name, original)
  end
end
