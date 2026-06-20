require "test_helper"

class MaskerTest < ActiveSupport::TestCase
  test "masks email addresses" do
    result = Guardrails::Masker.mask("Contact user@example.com for info")
    assert_equal "Contact [REDACTED_EMAIL] for info", result
  end

  test "masks phone numbers" do
    result = Guardrails::Masker.mask("Call +1-555-123-4567 today")
    assert_equal "Call [REDACTED_PHONE] today", result
  end

  test "masks SSN" do
    result = Guardrails::Masker.mask("SSN: 987-65-4321")
    assert_includes result, "[REDACTED_SSN]"
  end

  test "masks multiple PII types in one string" do
    result = Guardrails::Masker.mask("Email user@test.com and SSN 987-65-4321")
    assert_includes result, "[REDACTED_EMAIL]"
    assert_includes result, "[REDACTED_SSN]"
  end

  test "masks custom keywords" do
    result = Guardrails::Masker.mask("This is confidential data", keywords: ["confidential"])
    assert_equal "This is [REDACTED] data", result
  end

  test "masks keywords case-insensitively" do
    result = Guardrails::Masker.mask("SECRET info here", keywords: ["secret"])
    assert_equal "[REDACTED] info here", result
  end

  test "masks multiple keywords" do
    result = Guardrails::Masker.mask("secret and confidential", keywords: ["secret", "confidential"])
    assert_equal "[REDACTED] and [REDACTED]", result
  end

  test "custom replacement string" do
    result = Guardrails::Masker.mask("secret data", keywords: ["secret"], replacement: "***")
    assert_equal "*** data", result
  end

  test "handles nil input" do
    result = Guardrails::Masker.mask(nil)
    assert_equal "", result
  end

  test "handles empty string" do
    result = Guardrails::Masker.mask("")
    assert_equal "", result
  end

  test "no changes when no matches" do
    result = Guardrails::Masker.mask("normal text here", keywords: ["secret"])
    assert_equal "normal text here", result
  end
end
