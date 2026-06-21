class CreateProviders < ActiveRecord::Migration[8.0]
  def change
    create_table :providers do |t|
      t.string :name, null: false
      t.string :provider_type, null: false
      t.string :base_url
      t.string :api_key
      t.string :default_model
      t.boolean :active, default: true, null: false
      t.timestamps
    end

    add_index :providers, :provider_type
    add_index :providers, :active
  end
end
