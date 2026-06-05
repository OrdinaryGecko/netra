class CreateProjects < ActiveRecord::Migration[8.1]
  def change
    create_table :projects do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name, null: false
      t.string :key, null: false
      t.string :default_environment, null: false, default: "development"
      t.string :upstream_base_url
      t.string :upstream_provider
      t.string :encrypted_upstream_key
      t.string :fail_mode, null: false, default: "open"
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :projects, [:organization_id, :key], unique: true
  end
end
