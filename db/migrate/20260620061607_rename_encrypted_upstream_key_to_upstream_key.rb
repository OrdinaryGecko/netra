class RenameEncryptedUpstreamKeyToUpstreamKey < ActiveRecord::Migration[8.1]
  def change
    rename_column :projects, :encrypted_upstream_key, :upstream_key
  end
end
