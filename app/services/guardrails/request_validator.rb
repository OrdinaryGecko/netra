module Guardrails
  class RequestValidator
    REQUIRED_FIELDS = %i[environment provider model messages].freeze

    def self.call!(payload)
      errors = []

      REQUIRED_FIELDS.each do |field|
        errors << "#{field} is required" if payload[field].blank?
      end

      unless payload[:messages].is_a?(Array) && payload[:messages].all? { |message| message[:role].present? && message[:content].present? }
        errors << "messages must be an array of role/content objects"
      end

      raise ValidationError, errors if errors.any?
    end
  end
end
