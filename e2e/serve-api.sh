#!/bin/sh
# Starts a throwaway API for end-to-end tests: fresh SQLite database seeded with demo
# data, synchronous queue and no outgoing mail. The developer database is never touched.
set -e
cd "$(dirname "$0")/../../backend"

export APP_ENV=local APP_DEBUG=false
export DB_CONNECTION=sqlite DB_DATABASE="${TMPDIR:-/tmp}/insurehub-e2e.sqlite"
export QUEUE_CONNECTION=sync MAIL_MAILER=array CACHE_STORE=array TENDERS_ENABLED=true

rm -f "$DB_DATABASE"
touch "$DB_DATABASE"
php artisan migrate:fresh --force -q
for seeder in DemoDirectorySeeder DemoMarketplaceSeeder DemoTenderSeeder DemoBusinessSeeder; do
  php artisan db:seed --class="$seeder" --force -q
done

exec php artisan serve --host=127.0.0.1 --port="${E2E_API_PORT:-8100}"
