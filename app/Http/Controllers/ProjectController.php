<?php

namespace App\Http\Controllers;

use App\Models\Project;

class ProjectController extends Controller
{
    public function index()
    {
        return Project::query()
            ->orderByDesc('year')
            ->orderBy('title')
            ->get(['id', 'title', 'description', 'url', 'year']);
    }
}
