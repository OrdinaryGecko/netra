class CreateClientApplications < ActiveRecord::Migration[8.1]
  def change
    create_table :client_applications do |t|
      t.string :name, null: false
      t.string :key, null: false
      t.string :default_environment, null: false, default: "development"
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :client_applications, :key, unique: true
  end
end
