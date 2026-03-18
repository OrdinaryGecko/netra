class CreatePolicySets < ActiveRecord::Migration[8.1]
  def change
    create_table :policy_sets do |t|
      t.references :client_application, null: false, foreign_key: true
      t.string :name, null: false
      t.string :environment, null: false
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :policy_sets, [:client_application_id, :name, :environment], unique: true
  end
end
