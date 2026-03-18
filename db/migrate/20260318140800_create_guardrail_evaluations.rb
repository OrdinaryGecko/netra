class CreateGuardrailEvaluations < ActiveRecord::Migration[8.1]
  def change
    create_table :guardrail_evaluations do |t|
      t.references :guardrail_request, null: false, foreign_key: true
      t.string :stage, null: false
      t.string :rule_name, null: false
      t.string :rule_kind
      t.string :outcome, null: false
      t.string :action
      t.integer :latency_ms
      t.jsonb :details, null: false, default: {}

      t.timestamps
    end
  end
end
