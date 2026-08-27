<?php

use App\Http\Controllers\ContactController;
use App\Http\Controllers\SeoController;
use App\Support\Site;
use Illuminate\Support\Facades\Route;

// JSON endpoints the SPA fetches. Keep these above the catch-all below,
// which otherwise swallows every path and returns the HTML shell.
// The project list is not one of them: it ships in the bundle, see
// resources/js/data/projects.js.
Route::post('/api/contact', [ContactController::class, 'store']);

// Machine-readable descriptions of the site. robots.txt and llms.txt are
// routes rather than files in public/ so they can use the configured APP_URL
// instead of a hard-coded domain.
Route::get('/sitemap.xml', [SeoController::class, 'sitemap']);
Route::get('/robots.txt', [SeoController::class, 'robots']);
Route::get('/llms.txt', [SeoController::class, 'llms']);

// The SPA shell. Every known page gets its own server-rendered title,
// description and canonical (see App\Support\Site) because a crawler that
// doesn't run JavaScript sees nothing else.
Route::get('/{path?}', function (string $path = '/') {
    // Unknown paths still return the shell — the router's catch-all renders a
    // styled not-found page — but with a real 404 so crawlers don't index it
    // as a soft duplicate of the home page.
    $known = Site::isKnownPage($path);

    return response()
        ->view('app', [
            'page' => $known
                ? Site::page($path)
                : ['title' => 'Page not found — '.Site::NAME, 'noindex' => true],
        ], $known ? 200 : 404);
})->where('path', '.*');
