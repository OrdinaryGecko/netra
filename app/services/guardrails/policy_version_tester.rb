module Guardrails
  class PolicyVersionTester
    DEFAULT_PROVIDER = "stub".freeze
    DEFAULT_MODEL = "stub-v1".freeze

    def self.call(policy_version:, request_payload:)
      new(policy_version:, request_payload:).call
    end

    def self.call_for_project(project:, client_application:, environment:, request_payload:)
      new(project:, client_application:, environment:, request_payload:).call_for_project
    end

    def initialize(policy_version: nil, project: nil, client_application: nil, environment: nil, request_payload:)
      @policy_version = policy_version
      @project = project
      @client_application = client_application
      @environment = environment
      @request_payload = request_payload
    end

    def call
      RequestValidator.call!(normalized_payload)

      input_decision = Evaluator.call(
        rules: @policy_version.rules.enabled.where(stage: "input"),
        content: combined_input,
        options: options,
        messages: messages
      )

      if input_decision[:blocked]
        return dry_run_result(
          status: "blocked",
          action: "block",
          reasons: input_decision[:reasons],
          provider_response: nil,
          evaluations: input_decision[:evaluations]
        )
      end

      forwarded_messages = if input_decision[:masked]
        mask_messages(messages, input_decision[:mask_keywords], input_decision[:mask_replacement])
      else
        messages
      end

      provider_response = execute_provider? ? provider.complete(messages: forwarded_messages) : simulated_provider_response(forwarded_messages)

      output_decision = Evaluator.call(
        rules: @policy_version.rules.enabled.where(stage: "output"),
        content: provider_response[:content],
        options: options,
        provider_response:
      )

      action = if output_decision[:blocked]
        "block"
      elsif output_decision[:masked] || input_decision[:masked]
        "mask"
      else
        "allow"
      end

      status = output_decision[:blocked] ? "blocked" : "allowed"
      final_response = output_decision[:masked] ? provider_response.merge(content: Masker.mask(provider_response[:content], keywords: output_decision[:mask_keywords], replacement: output_decision[:mask_replacement])) : provider_response

      dry_run_result(
        status:,
        action:,
        reasons: input_decision[:reasons] + output_decision[:reasons],
        provider_response: output_decision[:blocked] ? nil : final_response,
        evaluations: input_decision[:evaluations] + output_decision[:evaluations]
      )
    end

    def call_for_project
      RequestValidator.call!(normalized_payload)

      resolved_sets = PolicyResolver.call!(
        client_application: @client_application,
        project: @project,
        environment: @environment
      )

      policy_versions = resolved_sets.map { |rs| rs[:policy_version] }
      rules_with_sets = composed_rules(resolved_sets)

      input_rules_with_sets = rules_with_sets.select { |_, rule| rule.stage == "input" }
      output_rules_with_sets = rules_with_sets.select { |_, rule| rule.stage == "output" }

      input_rules = input_rules_with_sets.map(&:last)
      output_rules = output_rules_with_sets.map(&:last)

      input_decision = Evaluator.call(
        rules: input_rules,
        content: combined_input,
        options: options,
        messages: messages
      )

      if input_decision[:blocked]
        return dry_run_result_for_project(
          policy_versions:,
          status: "blocked",
          action: "block",
          reasons: input_decision[:reasons],
          provider_response: nil,
          evaluations: format_evaluations(input_decision[:evaluations], input_rules_with_sets)
        )
      end

      forwarded_messages = if input_decision[:masked]
        mask_messages(messages, input_decision[:mask_keywords], input_decision[:mask_replacement])
      else
        messages
      end

      provider_response = execute_provider? ? provider.complete(messages: forwarded_messages) : simulated_provider_response(forwarded_messages)

      output_decision = Evaluator.call(
        rules: output_rules,
        content: provider_response[:content],
        options: options,
        provider_response:
      )

      action = if output_decision[:blocked]
        "block"
      elsif output_decision[:masked] || input_decision[:masked]
        "mask"
      else
        "allow"
      end

      status = output_decision[:blocked] ? "blocked" : "allowed"
      final_response = output_decision[:masked] ? provider_response.merge(content: Masker.mask(provider_response[:content], keywords: output_decision[:mask_keywords], replacement: output_decision[:mask_replacement])) : provider_response

      dry_run_result_for_project(
        policy_versions:,
        status:,
        action:,
        reasons: input_decision[:reasons] + output_decision[:reasons],
        provider_response: output_decision[:blocked] ? nil : final_response,
        evaluations: format_evaluations(input_decision[:evaluations] + output_decision[:evaluations], rules_with_sets)
      )
    end

    private

    def dry_run_result(status:, action:, reasons:, provider_response:, evaluations:)
      Result.new(
        status:,
        action:,
        reasons:,
        trace_id: SecureRandom.uuid,
        policy_versions: [@policy_version.version],
        provider_response:,
        messages: messages,
        evaluations: format_evaluations(evaluations),
        dry_run: true
      )
    end

    def dry_run_result_for_project(policy_versions:, status:, action:, reasons:, provider_response:, evaluations:)
      Result.new(
        status:,
        action:,
        reasons:,
        trace_id: SecureRandom.uuid,
        policy_versions: policy_versions.map(&:version),
        provider_response:,
        messages: messages,
        evaluations: evaluations,
        dry_run: true
      )
    end

    def composed_rules(resolved_sets)
      resolved_sets.flat_map do |rs|
        rs[:policy_version].rules.enabled.map { |rule| [rs[:policy_set], rule] }
      end
        .sort_by { |set, rule| [set.priority, rule.priority] }
    end

    def format_evaluations(evaluations, rules_with_sets = nil)
      evaluations.map do |evaluation|
        formatted = evaluation.merge(
          triggered: evaluation[:outcome] == "matched",
          detail: evaluation_detail(evaluation)
        )
        
        if rules_with_sets
          rule_id = evaluation[:rule_id]
          matching_rule = rules_with_sets.find { |_, rule| rule.id == rule_id }
          formatted[:policySetName] = matching_rule[0].name if matching_rule
        end
        
        formatted
      end
    end

    def evaluation_detail(evaluation)
      details = evaluation[:details] || {}

      case evaluation[:rule_kind]
      when "max_message_chars"
        length = details[:length] || details["length"] || 0
        max = details[:max] || details["max"] || 4_000
        scope = details[:scope] || details["scope"]
        suffix = scope.present? ? " on #{scope.tr('_', ' ')}" : ""

        evaluation[:outcome] == "matched" ? "Message is #{length} chars#{suffix} (max #{max})" : "Within limit#{suffix} (#{length}/#{max})"
      when "keyword_detector"
        keywords = Array(details[:keywords] || details["keywords"])
        scope = details[:scope] || details["scope"]
        suffix = scope.present? ? " in #{scope.tr('_', ' ')}" : ""

        evaluation[:outcome] == "matched" ? "Blocked keywords found#{suffix}: #{keywords.join(', ')}" : "No blocked keywords found#{suffix}"
      when "pii_detector"
        types = Array(details[:types] || details["types"])

        evaluation[:outcome] == "matched" ? "PII detected: #{types.join(', ')}" : "No PII detected"
      when "json_format"
        required = details[:required]
        required = details["required"] if required.nil?
        error = details[:error] || details["error"]

        return "JSON format not required" if required == false
        return "Invalid JSON format#{": #{error}" if error.present?}" if evaluation[:outcome] == "matched"

        "Valid JSON"
      else
        evaluation[:outcome] == "matched" ? "Rule triggered" : "No match"
      end
    end

    def provider
      Providers::Factory.build(provider: provider_name, model: model_name, options:)
    end

    def provider_name
      normalized_payload[:provider]
    end

    def model_name
      normalized_payload[:model]
    end

    def options
      normalized_payload[:options] || {}
    end

    def messages
      normalized_payload[:messages]
    end

    def combined_input
      messages.map { |message| message[:content] }.join("\n")
    end

    def mask_messages(msgs, keywords, replacement = "[REDACTED]")
      msgs.map do |msg|
        msg.merge(content: Masker.mask(msg[:content].to_s, keywords: keywords, replacement: replacement))
      end
    end

    def execute_provider?
      ActiveModel::Type::Boolean.new.cast(normalized_payload[:execute_provider])
    end

    def simulated_provider_response(forwarded_messages = nil)
      content = (forwarded_messages || messages).last[:content].to_s
      {
        provider: provider_name,
        model: model_name,
        content: content
      }
    end

    def normalized_payload
      @normalized_payload ||= {
        environment: @request_payload[:environment] || (@policy_version ? @policy_version.policy_set.environment : @environment),
        provider: @request_payload[:provider].presence || DEFAULT_PROVIDER,
        model: @request_payload[:model].presence || DEFAULT_MODEL,
        options: @request_payload[:options] || {},
        messages: @request_payload[:messages] || [],
        execute_provider: @request_payload[:execute_provider]
      }
    end
  end
end
