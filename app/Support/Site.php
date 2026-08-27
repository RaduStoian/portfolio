<?php

namespace App\Support;

use Illuminate\Support\Facades\File;

/**
 * Everything the server needs to describe this site to a crawler: the page
 * list, per-page metadata, and the project data.
 *
 * The SPA renders the same HTML shell for every route, so the only titles,
 * descriptions and canonicals a bot ever sees are the ones baked in here.
 * Adding a route to resources/js/router/index.js means adding it to PAGES
 * too, otherwise it inherits the generic defaults and never reaches the
 * sitemap.
 */
class Site
{
    public const NAME = 'Radu Stoian';

    public const TAGLINE = 'Senior Full-Stack Developer';

    public const EMAIL = 'radu.stoian0@gmail.com';

    /**
     * Indexable pages, keyed by path.
     *
     * `priority` and `changefreq` are sitemap hints. `noindex` marks the game
     * scenes: they are canvases with no crawlable text, and letting them into
     * the index would only add thin pages under the real ones. They are still
     * reachable and still render normally.
     */
    public const PAGES = [
        '/' => [
            'title' => 'Radu Stoian — Senior Full-Stack Developer',
            'description' => 'Portfolio of Radu (Mike) Stoian, a senior full-stack developer building web apps with Laravel, Vue and Go. Personal projects, career history and a pixel-art version of the site.',
            'priority' => '1.0',
        ],
        '/projects' => [
            'title' => 'Projects — Radu Stoian',
            'description' => 'Personal projects: ForgeKit, Mindstare, Vhoice, MovieSwiper and a browser-based physics museum.',
            'priority' => '0.8',
        ],
        '/contact' => [
            'title' => 'Contact — Radu Stoian',
            'description' => 'Get in touch about work, a project or a role. Messages go straight to my inbox.',
            'priority' => '0.6',
        ],
        '/play' => [
            'title' => 'Play — a pixel-art version of this portfolio — Radu Stoian',
            'description' => 'The same portfolio as an explorable pixel-art overworld: a curio shop of projects, a guild archive of career history, and a house to poke around in.',
            'priority' => '0.7',
        ],
        '/play/projects' => ['title' => 'The curio shop — Radu Stoian', 'noindex' => true],
        '/play/career' => ['title' => 'The guild archive — Radu Stoian', 'noindex' => true],
        '/play/about' => ['title' => 'The house — Radu Stoian', 'noindex' => true],
        '/play/graveyard' => ['title' => 'The graveyard — Radu Stoian', 'noindex' => true],
    ];

    /** Metadata for a path, falling back to the site defaults for unknown ones. */
    public static function page(string $path): array
    {
        $path = '/'.trim($path, '/');

        return static::PAGES[$path] ?? static::PAGES['/'];
    }

    public static function isKnownPage(string $path): bool
    {
        return isset(static::PAGES['/'.trim($path, '/')]);
    }

    /** The shared project list, the same file the frontend bundle imports. */
    public static function projects(): array
    {
        // Read once per request; in production the file is baked into the
        // image and never changes, so there is nothing to invalidate.
        static $projects = null;

        return $projects ??= json_decode(File::get(resource_path('data/projects.json')), true);
    }
}
