class RemoveUpstreamColumnsFromProjects < ActiveRecord::Migration[8.0]
  def change
    remove_column :projects, :upstream_provider, :string
    remove_column :projects, :upstream_base_url, :string
    remove_column :projects, :upstream_key, :string
    remove_column :projects, :default_model, :string
  end
end
