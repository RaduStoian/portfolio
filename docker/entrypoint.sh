#!/bin/sh
set -e

# storage/ is a bind mount from the host, so recreate the tree Laravel expects.
mkdir -p storage/app/public \
         storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/logs
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rw storage bootstrap/cache

php artisan migrate --force --no-interaction
php artisan storage:link --force || true

php artisan config:cache
php artisan route:cache
php artisan view:cache

exec "$@"
