# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_06_05_090200) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "agents", force: :cascade do |t|
    t.bigint "client_application_id", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.string "identifier", null: false
    t.string "name", null: false
    t.bigint "project_id"
    t.datetime "updated_at", null: false
    t.index ["client_application_id", "identifier"], name: "index_agents_on_client_application_id_and_identifier", unique: true
    t.index ["client_application_id"], name: "index_agents_on_client_application_id"
    t.index ["project_id"], name: "index_agents_on_project_id"
  end

  create_table "api_keys", force: :cascade do |t|
    t.string "access_level", default: "runtime", null: false
    t.boolean "active", default: true, null: false
    t.bigint "client_application_id", null: false
    t.datetime "created_at", null: false
    t.datetime "last_used_at"
    t.string "name", null: false
    t.bigint "project_id"
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["access_level"], name: "index_api_keys_on_access_level"
    t.index ["client_application_id"], name: "index_api_keys_on_client_application_id"
    t.index ["project_id"], name: "index_api_keys_on_project_id"
    t.index ["token_digest"], name: "index_api_keys_on_token_digest", unique: true
  end

  create_table "client_applications", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "default_environment", default: "development", null: false
    t.string "key", null: false
    t.string "name", null: false
    t.bigint "project_id"
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_client_applications_on_key", unique: true
    t.index ["project_id"], name: "index_client_applications_on_project_id"
  end

  create_table "guardrail_evaluations", force: :cascade do |t|
    t.string "action"
    t.datetime "created_at", null: false
    t.jsonb "details", default: {}, null: false
    t.bigint "guardrail_request_id", null: false
    t.integer "latency_ms"
    t.string "outcome", null: false
    t.string "rule_kind"
    t.string "rule_name", null: false
    t.string "stage", null: false
    t.datetime "updated_at", null: false
    t.index ["guardrail_request_id"], name: "index_guardrail_evaluations_on_guardrail_request_id"
  end

  create_table "guardrail_requests", force: :cascade do |t|
    t.bigint "agent_id"
    t.bigint "client_application_id", null: false
    t.datetime "created_at", null: false
    t.jsonb "decision", default: {}, null: false
    t.string "environment", null: false
    t.string "idempotency_key"
    t.jsonb "messages", default: [], null: false
    t.string "model", null: false
    t.datetime "occurred_at", null: false
    t.bigint "project_id"
    t.string "provider", null: false
    t.bigint "provider_config_id"
    t.jsonb "request_metadata", default: {}, null: false
    t.jsonb "response_payload", default: {}, null: false
    t.string "status", null: false
    t.string "trace_id", null: false
    t.datetime "updated_at", null: false
    t.index ["agent_id"], name: "index_guardrail_requests_on_agent_id"
    t.index ["client_application_id"], name: "index_guardrail_requests_on_client_application_id"
    t.index ["idempotency_key"], name: "index_guardrail_requests_on_idempotency_key"
    t.index ["project_id"], name: "index_guardrail_requests_on_project_id"
    t.index ["provider_config_id"], name: "index_guardrail_requests_on_provider_config_id"
    t.index ["trace_id"], name: "index_guardrail_requests_on_trace_id", unique: true
  end

  create_table "organizations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_organizations_on_slug", unique: true
  end

  create_table "policy_sets", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.bigint "client_application_id", null: false
    t.datetime "created_at", null: false
    t.string "environment", null: false
    t.string "name", null: false
    t.bigint "project_id"
    t.datetime "updated_at", null: false
    t.index ["client_application_id", "name", "environment"], name: "idx_on_client_application_id_name_environment_466b8e7641", unique: true
    t.index ["client_application_id"], name: "index_policy_sets_on_client_application_id"
    t.index ["project_id"], name: "index_policy_sets_on_project_id"
  end

  create_table "policy_versions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.jsonb "definition", default: {}, null: false
    t.bigint "policy_set_id", null: false
    t.datetime "published_at"
    t.string "status", default: "draft", null: false
    t.datetime "updated_at", null: false
    t.string "version", null: false
    t.index ["policy_set_id", "version"], name: "index_policy_versions_on_policy_set_id_and_version", unique: true
    t.index ["policy_set_id"], name: "index_policy_versions_on_policy_set_id"
  end

  create_table "projects", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "default_environment", default: "development", null: false
    t.string "encrypted_upstream_key"
    t.string "fail_mode", default: "open", null: false
    t.string "key", null: false
    t.string "name", null: false
    t.bigint "organization_id", null: false
    t.datetime "updated_at", null: false
    t.string "upstream_base_url"
    t.string "upstream_provider"
    t.index ["organization_id", "key"], name: "index_projects_on_organization_id_and_key", unique: true
    t.index ["organization_id"], name: "index_projects_on_organization_id"
  end

  create_table "provider_configs", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.bigint "client_application_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "project_id"
    t.string "provider", null: false
    t.jsonb "settings", default: {}, null: false
    t.datetime "updated_at", null: false
    t.index ["client_application_id"], name: "index_provider_configs_on_client_application_id"
    t.index ["project_id"], name: "index_provider_configs_on_project_id"
  end

  create_table "rules", force: :cascade do |t|
    t.string "action", null: false
    t.jsonb "config", default: {}, null: false
    t.datetime "created_at", null: false
    t.boolean "enabled", default: true, null: false
    t.string "kind", null: false
    t.string "name", null: false
    t.bigint "policy_version_id", null: false
    t.integer "priority", default: 100, null: false
    t.string "stage", null: false
    t.datetime "updated_at", null: false
    t.index ["policy_version_id"], name: "index_rules_on_policy_version_id"
  end

  add_foreign_key "agents", "client_applications"
  add_foreign_key "agents", "projects"
  add_foreign_key "api_keys", "client_applications"
  add_foreign_key "api_keys", "projects"
  add_foreign_key "client_applications", "projects"
  add_foreign_key "guardrail_evaluations", "guardrail_requests"
  add_foreign_key "guardrail_requests", "agents"
  add_foreign_key "guardrail_requests", "client_applications"
  add_foreign_key "guardrail_requests", "projects"
  add_foreign_key "guardrail_requests", "provider_configs"
  add_foreign_key "policy_sets", "client_applications"
  add_foreign_key "policy_sets", "projects"
  add_foreign_key "policy_versions", "policy_sets"
  add_foreign_key "projects", "organizations"
  add_foreign_key "provider_configs", "client_applications"
  add_foreign_key "provider_configs", "projects"
  add_foreign_key "rules", "policy_versions"
end
