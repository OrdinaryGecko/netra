class CreateProjectProviders < ActiveRecord::Migration[8.0]
  def change
    create_table :project_providers do |t|
      t.references :project, null: false, foreign_key: true
      t.bigint :provider_id, null: false
      t.boolean :is_default, default: false, null: false
      t.string :default_model
      t.string :environment, null: false, default: "development"
      t.timestamps
    end

    add_index :project_providers, [:project_id, :provider_id, :environment], unique: true
    add_index :project_providers, [:project_id, :environment, :is_default], unique: true, where: "is_default = true"
    add_index :project_providers, :provider_id
  end
end
