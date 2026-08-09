<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProjectController;

// JSON endpoints the SPA fetches. Keep these above the catch-all below,
// which otherwise swallows every path and returns the HTML shell.
Route::get('/api/projects', [ProjectController::class, 'index']);

// Vue app shell: root + everything else.
Route::view('/', 'app');

Route::view('/{any}', 'app')
    ->where('any', '.*');
