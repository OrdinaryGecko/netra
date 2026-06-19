class RemoveFailModeFromProjects < ActiveRecord::Migration[8.1]
  def change
    remove_column :projects, :fail_mode, :string
  end
end
