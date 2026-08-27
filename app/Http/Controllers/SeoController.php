<?php

namespace App\Http\Controllers;

use App\Support\Site;

/**
 * The three files crawlers and agents look for. All generated from
 * App\Support\Site so the page list only exists in one place.
 */
class SeoController extends Controller
{
    public function sitemap()
    {
        $urls = collect(Site::PAGES)
            ->reject(fn ($meta) => $meta['noindex'] ?? false)
            ->map(fn ($meta, $path) => [
                'loc' => rtrim(config('app.url'), '/').($path === '/' ? '/' : $path),
                'priority' => $meta['priority'] ?? '0.5',
            ]);

        return response()
            ->view('seo.sitemap', ['urls' => $urls])
            ->header('Content-Type', 'application/xml');
    }

    public function robots()
    {
        $base = rtrim(config('app.url'), '/');

        $lines = [
            'User-agent: *',
            'Allow: /',
            '',
            // The game scenes are canvases with no crawlable text. Keeping
            // them out of the index costs nothing and keeps the four real
            // pages from competing with four empty ones.
            'Disallow: /play/',
            '',
            'Sitemap: '.$base.'/sitemap.xml',
            '',
        ];

        return response(implode("\n", $lines))->header('Content-Type', 'text/plain; charset=UTF-8');
    }

    /**
     * llms.txt — the emerging convention (llmstxt.org) for handing an LLM or
     * agentic browser a clean markdown summary of a site instead of making it
     * scrape a JavaScript app. Especially worth having here: without it, an
     * agent that doesn't execute JS sees an empty <div id="app">.
     */
    public function llms()
    {
        return response()
            ->view('seo.llms', [
                'base' => rtrim(config('app.url'), '/'),
                'projects' => Site::projects(),
            ])
            ->header('Content-Type', 'text/plain; charset=UTF-8');
    }
}
