class CreateRules < ActiveRecord::Migration[8.1]
  def change
    create_table :rules do |t|
      t.references :policy_version, null: false, foreign_key: true
      t.string :name, null: false
      t.string :kind, null: false
      t.string :stage, null: false
      t.string :action, null: false
      t.integer :priority, null: false, default: 100
      t.boolean :enabled, null: false, default: true
      t.jsonb :config, null: false, default: {}

      t.timestamps
    end
  end
end
