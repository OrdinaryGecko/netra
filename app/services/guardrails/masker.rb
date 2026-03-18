module Guardrails
  class Masker
    EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
    PHONE_REGEX = /(?<!\d)(?:\+?\d[\d\s-]{7,}\d)(?!\d)/
    SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/

    def self.mask(text)
      text.to_s
        .gsub(EMAIL_REGEX, "[REDACTED_EMAIL]")
        .gsub(PHONE_REGEX, "[REDACTED_PHONE]")
        .gsub(SSN_REGEX, "[REDACTED_SSN]")
    end
  end
end
