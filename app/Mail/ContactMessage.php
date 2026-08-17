<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContactMessage extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $senderName,
        public string $senderEmail,
        public string $body,
    ) {
    }

    public function build(): self
    {
        return $this
            ->subject("Portfolio contact form: {$this->senderName}")
            ->replyTo($this->senderEmail, $this->senderName)
            ->view('emails.contact');
    }
}
