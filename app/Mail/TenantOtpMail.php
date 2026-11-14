<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TenantOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $otpCode,
        public string $appName = 'Zenbase',
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[{$this->appName}] Votre code de connexion OTP : {$this->otpCode}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            htmlString: "
                <div style=\"font-family: sans-serif; padding: 24px; color: #18181b;\">
                    <h2 style=\"margin-bottom: 8px;\">Connexion à {$this->appName}</h2>
                    <p>Voici votre code de vérification à usage unique (valable 10 minutes) :</p>
                    <div style=\"font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 16px; background: #f4f4f5; border-radius: 8px; display: inline-block; margin: 16px 0;\">
                        {$this->otpCode}
                    </div>
                    <p style=\"font-size: 12px; color: #71717a;\">Propulsé par Zenbase Auth.</p>
                </div>
            ",
        );
    }
}
