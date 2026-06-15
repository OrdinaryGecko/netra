class CreateProjects < ActiveRecord::Migration[8.1]
  def change
    create_table :projects do |t|
      t.string :name, null: false
      t.string :key, null: false
      t.string :upstream_base_url
      t.string :upstream_provider
      t.string :encrypted_upstream_key
      t.string :fail_mode, null: false, default: "open"
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :projects, :key, unique: true
  end
end
