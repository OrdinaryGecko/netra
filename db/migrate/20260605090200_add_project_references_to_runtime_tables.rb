class AddProjectReferencesToRuntimeTables < ActiveRecord::Migration[8.1]
  def up
    add_reference :client_applications, :project, foreign_key: true
    add_reference :agents, :project, foreign_key: true
    add_reference :api_keys, :project, foreign_key: true
    add_reference :policy_sets, :project, foreign_key: true
    add_reference :provider_configs, :project, foreign_key: true
    add_reference :guardrail_requests, :project, foreign_key: true
  end

  def down
    remove_reference :guardrail_requests, :project, foreign_key: true
    remove_reference :provider_configs, :project, foreign_key: true
    remove_reference :policy_sets, :project, foreign_key: true
    remove_reference :api_keys, :project, foreign_key: true
    remove_reference :agents, :project, foreign_key: true
    remove_reference :client_applications, :project, foreign_key: true
  end
end
