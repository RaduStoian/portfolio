<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // firstOrCreate rather than create: this seeder is the only way the
        // project copy below gets updated, so it has to stay re-runnable.
        // A plain create() threw a duplicate-email error on every run after
        // the first, taking the projects down with it.
        if (! User::query()->where('email', 'test@example.com')->exists()) {
            User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);
        }

        // Titles are the join key in two places: the pixel shop scene
        // (resources/js/game/scenes/shop.vue) matches its displays by `title`
        // case-insensitively against the labels in game/art/shop.js, and the
        // home page picks each project's bespoke CSS visual the same way (see
        // resources/js/vue/project-visual.vue). Renaming a project here means
        // renaming it in both of those too.
        //
        // A null `url` means "not live yet". The UI renders that as a
        // non-clickable tile with an "In development" note rather than a dead
        // link, so leave it null instead of pointing at a placeholder.
        foreach ([
            [
                'title' => 'ForgeKit',
                'year' => 2026,
                'description' => 'A local development environment along the lines of XAMPP, with every service in one place and a lot less setup to fight through.',
                'url' => 'https://forgekit.tools',
            ],
            [
                'title' => 'Mindstare',
                'year' => 2025,
                'description' => 'A meditation app built around visual video journeys and mood-based sessions.',
                'url' => 'https://mindstare.com',
            ],
            [
                'title' => 'Vhoice',
                'year' => 2025,
                'description' => 'An IMDb-style public database for politics, where people rate and review politicians.',
                'url' => 'https://vhoice.net',
            ],
            [
                'title' => 'MovieSwiper',
                'year' => 2024,
                'description' => 'Tinder for films. Swipe with your friends and match on something everyone wants to watch.',
                'url' => null,
            ],
            [
                'title' => 'Physics Museum',
                'year' => 2024,
                'description' => 'A physics museum you explore in the browser, with interactive 3D exhibits rendered in real time.',
                'url' => null,
            ],
        ] as $project) {
            Project::query()->updateOrCreate(['title' => $project['title']], $project);
        }
    }
}
