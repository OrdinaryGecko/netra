#!/bin/bash
set -e

rm -f /app/tmp/pids/server.pid

until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" 2>/dev/null; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

bundle exec rails db:create db:migrate

if [ "${SEED_DB:-false}" = "true" ]; then
  bundle exec rails db:seed
fi

exec "$@"
