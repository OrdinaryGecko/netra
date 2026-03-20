class AddAccessLevelToApiKeys < ActiveRecord::Migration[8.1]
  def change
    add_column :api_keys, :access_level, :string, null: false, default: "runtime"
    add_index :api_keys, :access_level
  end
end
