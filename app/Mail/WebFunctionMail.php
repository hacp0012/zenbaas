<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WebFunctionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $mailSubject,
        public ?string $htmlBody = null,
        public ?string $textBody = null,
        public ?string $replyToAddress = null,
        public ?string $fromName = null,
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $fromAddress = (string) config('mail.from.address', 'hello@example.com');
        $resolvedFromName = ($this->fromName !== null && $this->fromName !== '')
            ? $this->fromName
            : (string) config('mail.from.name', 'Zenbase');

        $replyTo = $this->replyToAddress !== null && $this->replyToAddress !== ''
            ? [new Address($this->replyToAddress)]
            : [];

        return new Envelope(
            from: new Address($fromAddress, $resolvedFromName),
            replyTo: $replyTo,
            subject: $this->mailSubject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        if ($this->textBody !== null && $this->htmlBody !== null) {
            return new Content(
                text: 'emails.web-function-text',
                with: ['textBody' => $this->textBody],
                htmlString: $this->htmlBody,
            );
        }

        if ($this->htmlBody !== null) {
            return new Content(
                htmlString: $this->htmlBody,
            );
        }

        return new Content(
            text: 'emails.web-function-text',
            with: ['textBody' => (string) $this->textBody],
        );
    }
}
