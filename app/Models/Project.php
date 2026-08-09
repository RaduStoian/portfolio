<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['title', 'description', 'url', 'year'];

    protected $casts = ['year' => 'integer'];
}
