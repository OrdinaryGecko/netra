class CreateGuardrailRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :guardrail_requests do |t|
      t.references :client_application, null: false, foreign_key: true
      t.references :agent, foreign_key: true
      t.references :provider_config, foreign_key: true
      t.string :trace_id, null: false
      t.string :environment, null: false
      t.string :provider, null: false
      t.string :model, null: false
      t.string :status, null: false
      t.string :idempotency_key
      t.jsonb :messages, null: false, default: []
      t.jsonb :request_metadata, null: false, default: {}
      t.jsonb :response_payload, null: false, default: {}
      t.jsonb :decision, null: false, default: {}
      t.datetime :occurred_at, null: false

      t.timestamps
    end

    add_index :guardrail_requests, :trace_id, unique: true
    add_index :guardrail_requests, :idempotency_key
  end
end
