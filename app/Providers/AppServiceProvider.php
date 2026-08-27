<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Behind the reverse proxy, PHP sees a plain http request on an
        // internal port, so every generated URL — the @vite tags included —
        // came out as http:// and the browser blocked them as mixed content.
        // TrustProxies in bootstrap/app.php handles the well-behaved case;
        // this makes it unconditional whenever the site is configured as
        // https, no matter what headers the proxy forwards.
        if (str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}
