<?php

namespace App\Modules\Functions\Services;

use App\Mail\WebFunctionMail;
use App\Models\App;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use InvalidArgumentException;

class FunctionMailService
{
    public const MAX_SENDS_PER_INVOCATION = 5;

    public const MAX_RECIPIENTS_PER_EMAIL = 10;

    public const MAX_SENDS_PER_MINUTE = 30;

    public const MAX_SUBJECT_LENGTH = 200;

    public const MAX_FROM_NAME_LENGTH = 80;

    public const MAX_BODY_BYTES = 100_000;

    private int $sendsInInvocation = 0;

    private int $maxSendsPerInvocation;

    private int $maxRecipientsPerEmail;

    private int $maxSendsPerMinute;

    private bool $rateLimitingEnabled;

    public function __construct(
        private App $app,
    ) {
        $limits = $app->rateLimitSettings();
        $this->maxSendsPerInvocation = $limits['function_mail_per_invocation'];
        $this->maxRecipientsPerEmail = $limits['function_mail_max_recipients'];
        $this->maxSendsPerMinute = $limits['function_mail_per_minute'];
        $this->rateLimitingEnabled = $limits['enabled'];
    }

    /**
     * Send an email immediately from a serverless Web Function with strict validation and rate limiting.
     *
     * @param  array{
     *     to?: string|array<int, string>,
     *     cc?: string|array<int, string>|null,
     *     bcc?: string|array<int, string>|null,
     *     subject?: string,
     *     html?: string|null,
     *     text?: string|null,
     *     reply_to?: string|null,
     *     from_name?: string|null
     * }  $options
     * @return array{
     *     sent: bool,
     *     queued: bool,
     *     to: array<int, string>,
     *     cc: array<int, string>,
     *     bcc: array<int, string>,
     *     subject: string
     * }
     */
    public function send(array $options): array
    {
        return $this->dispatch($options, false);
    }

    /**
     * Queue an email asynchronously from a serverless Web Function (recommended for slow SMTP transports).
     *
     * @param  array{
     *     to?: string|array<int, string>,
     *     cc?: string|array<int, string>|null,
     *     bcc?: string|array<int, string>|null,
     *     subject?: string,
     *     html?: string|null,
     *     text?: string|null,
     *     reply_to?: string|null,
     *     from_name?: string|null
     * }  $options
     * @return array{
     *     sent: bool,
     *     queued: bool,
     *     to: array<int, string>,
     *     cc: array<int, string>,
     *     bcc: array<int, string>,
     *     subject: string
     * }
     */
    public function queue(array $options): array
    {
        return $this->dispatch($options, true);
    }

    /**
     * Validate options, enforce invocation & per-app rate limits, and dispatch the mailable.
     *
     * @param  array<string, mixed>  $options
     * @return array{
     *     sent: bool,
     *     queued: bool,
     *     to: array<int, string>,
     *     cc: array<int, string>,
     *     bcc: array<int, string>,
     *     subject: string
     * }
     */
    private function dispatch(array $options, bool $shouldQueue): array
    {
        if ($this->sendsInInvocation >= $this->maxSendsPerInvocation) {
            throw new InvalidArgumentException(
                sprintf('Limite atteinte : une Web Function ne peut pas envoyer plus de %d e-mails par invocation.', $this->maxSendsPerInvocation)
            );
        }

        $rateLimitKey = "zenbase-fn-mail:{$this->app->id}";
        if ($this->rateLimitingEnabled && RateLimiter::tooManyAttempts($rateLimitKey, $this->maxSendsPerMinute)) {
            $retryAfter = RateLimiter::availableIn($rateLimitKey);

            throw new InvalidArgumentException(
                sprintf(
                    "Limite d'envoi d'e-mails atteinte pour cette application (%d/min). Réessayez dans %d seconde(s).",
                    $this->maxSendsPerMinute,
                    $retryAfter
                )
            );
        }

        $to = $this->normalizeRecipients($options['to'] ?? null, 'to');
        if ($to === []) {
            throw new InvalidArgumentException('Le champ [to] est obligatoire et doit contenir au moins une adresse e-mail valide.');
        }

        $cc = $this->normalizeRecipients($options['cc'] ?? null, 'cc');
        $bcc = $this->normalizeRecipients($options['bcc'] ?? null, 'bcc');

        $totalRecipients = count($to) + count($cc) + count($bcc);
        if ($totalRecipients > $this->maxRecipientsPerEmail) {
            throw new InvalidArgumentException(
                sprintf('Trop de destinataires (%d). Maximum autorisé par e-mail : %d.', $totalRecipients, $this->maxRecipientsPerEmail)
            );
        }

        $subject = $this->validateHeaderLine($options['subject'] ?? null, 'subject', self::MAX_SUBJECT_LENGTH, true);
        if ($subject === null) {
            throw new InvalidArgumentException('Le champ [subject] est obligatoire.');
        }

        $fromName = $this->validateHeaderLine(
            $options['from_name'] ?? $this->app->name,
            'from_name',
            self::MAX_FROM_NAME_LENGTH,
            false
        );

        $replyTo = null;
        if (isset($options['reply_to']) && $options['reply_to'] !== '') {
            if (! is_string($options['reply_to'])) {
                throw new InvalidArgumentException('Le champ [reply_to] doit être une adresse e-mail.');
            }
            $replyTo = $this->validateSingleEmail($options['reply_to'], 'reply_to');
        }

        $htmlBody = $this->validateBody($options['html'] ?? null, 'html');
        $textBody = $this->validateBody($options['text'] ?? null, 'text');

        if ($htmlBody === null && $textBody === null) {
            throw new InvalidArgumentException('Vous devez fournir au moins un corps de message [html] ou [text].');
        }

        $mailable = new WebFunctionMail(
            mailSubject: $subject,
            htmlBody: $htmlBody,
            textBody: $textBody,
            replyToAddress: $replyTo,
            fromName: $fromName,
        );

        $pendingMail = Mail::to($to);
        if ($cc !== []) {
            $pendingMail->cc($cc);
        }
        if ($bcc !== []) {
            $pendingMail->bcc($bcc);
        }

        if ($shouldQueue) {
            $pendingMail->queue($mailable);
        } else {
            $pendingMail->send($mailable);
        }

        $this->sendsInInvocation++;
        RateLimiter::hit($rateLimitKey, 60);

        return [
            'sent' => ! $shouldQueue,
            'queued' => $shouldQueue,
            'to' => $to,
            'cc' => $cc,
            'bcc' => $bcc,
            'subject' => $subject,
        ];
    }

    /**
     * Normalize and validate one or multiple recipient email addresses.
     *
     * @return array<int, string>
     */
    private function normalizeRecipients(mixed $raw, string $field): array
    {
        if ($raw === null || $raw === '' || $raw === []) {
            return [];
        }

        $items = is_string($raw) ? [$raw] : (is_array($raw) ? array_values($raw) : null);

        if ($items === null) {
            throw new InvalidArgumentException("Le champ [{$field}] doit être une chaîne ou un tableau d'adresses e-mail.");
        }

        $validated = [];
        foreach ($items as $item) {
            if (! is_string($item)) {
                throw new InvalidArgumentException("Chaque destinataire dans [{$field}] doit être une chaîne de caractères.");
            }
            $validated[] = $this->validateSingleEmail($item, $field);
        }

        return array_values(array_unique($validated));
    }

    /**
     * Validate a single email address and prevent CR/LF header injection.
     */
    private function validateSingleEmail(string $email, string $field): string
    {
        if (preg_match('/[\r\n]/', $email) === 1) {
            throw new InvalidArgumentException("Caractères de retour à la ligne interdits dans [{$field}].");
        }

        $trimmed = trim($email);
        if ($trimmed === '' || filter_var($trimmed, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException("Adresse e-mail invalide dans [{$field}] : [{$trimmed}].");
        }

        return $trimmed;
    }

    /**
     * Validate a single-line mail header string (subject, from_name) against CR/LF injection and length limits.
     */
    private function validateHeaderLine(mixed $value, string $field, int $maxLength, bool $required): ?string
    {
        if ($value === null || $value === '') {
            if ($required) {
                throw new InvalidArgumentException("Le champ [{$field}] est obligatoire.");
            }

            return null;
        }

        if (! is_string($value)) {
            throw new InvalidArgumentException("Le champ [{$field}] doit être une chaîne de caractères.");
        }

        if (preg_match('/[\r\n]/', $value) === 1) {
            throw new InvalidArgumentException("Caractères de retour à la ligne interdits dans [{$field}] (protection contre l'injection d'en-têtes).");
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            if ($required) {
                throw new InvalidArgumentException("Le champ [{$field}] ne peut pas être vide.");
            }

            return null;
        }

        if (mb_strlen($trimmed) > $maxLength) {
            throw new InvalidArgumentException("Le champ [{$field}] dépasse la taille maximale autorisée ({$maxLength} caractères).");
        }

        return $trimmed;
    }

    /**
     * Validate an optional HTML or plain-text email body.
     */
    private function validateBody(mixed $value, string $field): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (! is_string($value)) {
            throw new InvalidArgumentException("Le champ [{$field}] doit être une chaîne de caractères.");
        }

        if (strlen($value) > self::MAX_BODY_BYTES) {
            throw new InvalidArgumentException(
                sprintf('Le corps [%s] dépasse la taille maximale autorisée (%d Ko).', $field, (int) (self::MAX_BODY_BYTES / 1000))
            );
        }

        return $value;
    }
}
