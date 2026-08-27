<?php

namespace Database\Seeders;

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
        // The projects used to live here. They are static content with no
        // editing UI, so they now ship with the frontend bundle instead:
        // resources/js/data/projects.js.

        // firstOrCreate rather than create: a plain create() threw a
        // duplicate-email error on every run after the first.
        if (! User::query()->where('email', 'test@example.com')->exists()) {
            User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);
        }
    }
}
