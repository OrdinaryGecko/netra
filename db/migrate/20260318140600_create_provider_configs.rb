class CreateProviderConfigs < ActiveRecord::Migration[8.1]
  def change
    create_table :provider_configs do |t|
      t.references :client_application, null: false, foreign_key: true
      t.string :name, null: false
      t.string :provider, null: false
      t.boolean :active, null: false, default: true
      t.jsonb :settings, null: false, default: {}

      t.timestamps
    end
  end
end
