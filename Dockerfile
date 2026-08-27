# ---- build frontend assets ----
FROM node:22-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY vite.config.js ./
COPY resources ./resources
COPY public ./public
RUN npm run build

# ---- install php dependencies ----
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY . .
RUN composer dump-autoload --optimize --no-dev

# ---- runtime: single container, FrankenPHP serves http on :80 ----
FROM dunglas/frankenphp:php8.4-alpine

RUN install-php-extensions pdo_mysql opcache intl zip gd

WORKDIR /app

COPY --from=vendor /app /app
COPY --from=assets /app/public/build /app/public/build

COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint \
    && chown -R www-data:www-data /app

ENV SERVER_NAME=:80
EXPOSE 80

ENTRYPOINT ["entrypoint"]
CMD ["frankenphp", "php-server", "--root", "/app/public", "--listen", ":80"]
