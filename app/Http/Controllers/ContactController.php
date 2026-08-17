<?php

namespace App\Http\Controllers;

use App\Mail\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    // Fixed on purpose. This form has exactly one recipient, so an env var
    // would just be an extra place for the address to silently drift.
    private const RECIPIENT = 'radu.stoian0@gmail.com';

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'message' => ['required', 'string', 'max:5000'],
            // Honeypot: a real visitor never fills in a field this well hidden.
            // Silently succeeding (not a 422) keeps bots from learning it exists.
            'website' => ['prohibited'],
        ]);

        Mail::to(self::RECIPIENT)->send(new ContactMessage($data['name'], $data['email'], $data['message']));

        return response()->json(['status' => 'sent']);
    }
}
