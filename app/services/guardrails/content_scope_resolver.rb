module Guardrails
  class ContentScopeResolver
    DEFAULT_SCOPE_BY_RULE_KIND = {
      "max_message_chars" => "latest_user_message",
      "keyword_blocklist" => "latest_user_message",
      "pii_detector" => "latest_user_message"
    }.freeze

    def self.call(rule:, messages:, fallback_content:)
      new(rule:, messages:, fallback_content:).call
    end

    def initialize(rule:, messages:, fallback_content:)
      @rule = rule
      @messages = Array(messages)
      @fallback_content = fallback_content.to_s
    end

    def call
      scope = scope_for_rule

      {
        content: content_for_scope(scope),
        scope:
      }
    end

    private

    def scope_for_rule
      @rule.config&.fetch("scope", nil).presence ||
        DEFAULT_SCOPE_BY_RULE_KIND.fetch(@rule.kind, "full_conversation")
    end

    def content_for_scope(scope)
      case scope
      when "latest_user_message"
        latest_message_with_role("user")
      when "latest_message"
        message_content(@messages.last)
      when "all_user_messages"
        join_messages(@messages.select { |message| message_role(message) == "user" })
      when "system_messages"
        join_messages(@messages.select { |message| %w[system developer].include?(message_role(message)) })
      when "recent_messages"
        count = Integer(@rule.config&.fetch("message_count", 4) || 4)
        join_messages(@messages.last(count))
      when "full_conversation"
        join_messages(@messages)
      else
        @fallback_content
      end.presence || @fallback_content
    end

    def latest_message_with_role(role)
      message = @messages.reverse.find { |candidate| message_role(candidate) == role }
      message_content(message)
    end

    def join_messages(messages)
      messages.map { |message| message_content(message) }.join("\n")
    end

    def message_role(message)
      message.to_h[:role].to_s.presence || message.to_h["role"].to_s
    end

    def message_content(message)
      return "" if message.blank?

      message.to_h[:content].to_s.presence || message.to_h["content"].to_s
    end
  end
end
