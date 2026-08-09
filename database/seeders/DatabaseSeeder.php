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

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // The projects shop scene (resources/js/game/scenes/shop.vue) matches
        // each display by `title`, case-insensitively, so these five titles
        // must stay in sync with the labels in resources/js/game/art/shop.js.
        // `url` is what the glowing arrow on each plinth opens in a new tab —
        // it's a placeholder below; point it at each project's real repo or
        // writeup.
        foreach ([
            ['title' => 'Mindstare', 'year' => 2025, 'description' => 'TODO: describe Mindstare.', 'url' => 'https://github.com/'],
            ['title' => 'Vhoice', 'year' => 2025, 'description' => 'TODO: describe Vhoice.', 'url' => 'https://github.com/'],
            ['title' => 'MovieSwiper', 'year' => 2024, 'description' => 'TODO: describe MovieSwiper.', 'url' => 'https://github.com/'],
            ['title' => 'Physics Museum', 'year' => 2024, 'description' => 'TODO: describe Physics Museum.', 'url' => 'https://github.com/'],
            ['title' => 'ForgeKit', 'year' => 2026, 'description' => 'TODO: describe ForgeKit.', 'url' => 'https://github.com/'],
        ] as $project) {
            Project::query()->updateOrCreate(['title' => $project['title']], $project);
        }
    }
}
