class AddEnabledAndPriorityToPolicySets < ActiveRecord::Migration[8.0]
  def change
    add_column :policy_sets, :enabled, :boolean, default: true, null: false
    add_column :policy_sets, :priority, :integer, default: 100, null: false
  end
end
