# Deploying

One container. FrankenPHP serves the app on port 80 inside it; a reverse proxy
on the host terminates TLS in front of it.

## Server layout

```
/var/www/app/stoianworks/.env        # copied from .env.production.example, filled in
/var/www/app/stoianworks/storage/    # Laravel storage, persisted across deploys
```

The application code is not on the host — it is baked into the image.

One-time setup:

```sh
mkdir -p /var/www/app/stoianworks/storage
chown -R 82:82 /var/www/app/stoianworks/storage   # uid 82 = www-data in alpine
cp .env.production.example /var/www/app/stoianworks/.env   # then edit it
docker run --rm ghcr.io/<you>/stoianworks:latest php artisan key:generate --show
# paste that value into APP_KEY
```

Create the database and user in the MySQL container (`stoianworks` / `stoianworks`);
the entrypoint runs `php artisan migrate --force` on every start, so no manual
migration step is needed. The schema is only users, sessions, cache and jobs —
the project list ships in the frontend bundle.

## Run

```sh
docker run -d --name stoianworks --restart unless-stopped \
  -p 8080:80 \
  --add-host=host.docker.internal:host-gateway \
  -v /var/www/app/stoianworks/.env:/app/.env:ro \
  -v /var/www/app/stoianworks/storage:/app/storage \
  ghcr.io/<you>/stoianworks:latest
```

Deploying a new version is `docker pull` + `docker rm -f` + the same `docker run`.

## Reverse proxy

The app trusts proxy headers (`bootstrap/app.php`) and forces https URLs whenever
`APP_URL` is https (`AppServiceProvider`), so `X-Forwarded-Proto` must be set or
the browser will block the stylesheets as mixed content.

```nginx
server {
    listen 443 ssl http2;
    server_name stoianworks.com www.stoianworks.com;

    # certbot --nginx fills these in
    ssl_certificate     /etc/letsencrypt/live/stoianworks.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stoianworks.com/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    client_max_body_size 8m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
    }
}

server {
    listen 80;
    server_name stoianworks.com www.stoianworks.com;
    return 301 https://stoianworks.com$request_uri;
}
```

Pick one canonical hostname (with or without `www`) and 301 the other to it —
`APP_URL` must match the winner, since every canonical tag is built from it.

## Health

`GET /up` is Laravel's health endpoint and backs the container's `HEALTHCHECK`.
`docker inspect --format '{{.State.Health.Status}}' stoianworks` reports it.

## After the first deploy

- `https://stoianworks.com/robots.txt`, `/sitemap.xml` and `/llms.txt` should all
  render with the real domain in them. If they say `portfolio.test`, `APP_URL` is
  wrong in the server `.env`.
- Submit `/sitemap.xml` in Google Search Console.
- Set real `MAIL_*` credentials, or the contact form will accept messages and
  quietly write them to `storage/logs` instead of your inbox.
