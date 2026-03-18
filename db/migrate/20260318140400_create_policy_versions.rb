class CreatePolicyVersions < ActiveRecord::Migration[8.1]
  def change
    create_table :policy_versions do |t|
      t.references :policy_set, null: false, foreign_key: true
      t.string :version, null: false
      t.string :status, null: false, default: "draft"
      t.datetime :published_at
      t.jsonb :definition, null: false, default: {}

      t.timestamps
    end

    add_index :policy_versions, [:policy_set_id, :version], unique: true
  end
end
