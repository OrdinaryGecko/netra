class AddDefaultModelToProjects < ActiveRecord::Migration[8.0]
  def change
    add_column :projects, :default_model, :string
  end
end
