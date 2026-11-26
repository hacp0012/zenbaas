<?php

use App\Mail\WebFunctionMail;
use App\Models\App;
use App\Modules\Functions\Services\FunctionHttpClient;
use App\Services\TenantManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpClientRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

afterEach(function (): void {
    FunctionHttpClient::setDnsResolver(null);
});

test('web functions can send and queue validated emails via $context->mail', function () {
    Mail::fake();

    $app = App::factory()->create(['name' => 'ShopApp']);

    $app->functions()->create([
        'name' => 'send-order-confirmation',
        'code' => <<<'PHP'
return function ($event, $context) {
    $syncResult = $context->mail->send([
        'to' => $event['payload']['email'],
        'cc' => ['audit@example.com'],
        'bcc' => 'archive@example.com',
        'reply_to' => 'support@example.com',
        'subject' => 'Confirmation commande #42',
        'html' => '<h1>Merci !</h1><p>Votre commande est confirmée.</p>',
        'text' => 'Merci ! Votre commande est confirmée.',
    ]);

    $queuedResult = $context->mail->queue([
        'to' => 'team@example.com',
        'subject' => 'Nouvelle commande #42',
        'text' => 'Une nouvelle commande vient d\'arriver.',
    ]);

    return [
        'status' => 200,
        'data' => [
            'sync' => $syncResult,
            'queued' => $queuedResult,
        ],
    ];
};
PHP,
        'env_variables' => [],
        'logs' => [],
        'is_active' => true,
    ]);

    $response = $this->postJson('/api/v1/functions/send-order-confirmation/invoke', [
        'email' => 'alice@example.com',
    ], ['X-Zenbase-Api-Key' => $app->public_key])->assertOk();

    expect($response->json('data.sync.sent'))->toBeTrue();
    expect($response->json('data.sync.queued'))->toBeFalse();
    expect($response->json('data.sync.to'))->toBe(['alice@example.com']);
    expect($response->json('data.queued.queued'))->toBeTrue();

    Mail::assertSent(WebFunctionMail::class, function (WebFunctionMail $mail): bool {
        return $mail->hasTo('alice@example.com')
            && $mail->hasCc('audit@example.com')
            && $mail->hasBcc('archive@example.com')
            && $mail->mailSubject === 'Confirmation commande #42'
            && $mail->replyToAddress === 'support@example.com'
            && $mail->fromName === 'ShopApp'
            && str_contains((string) $mail->htmlBody, '<h1>Merci !</h1>')
            && $mail->textBody === 'Merci ! Votre commande est confirmée.';
    });

    Mail::assertQueued(WebFunctionMail::class, function (WebFunctionMail $mail): bool {
        return $mail->hasTo('team@example.com')
            && $mail->mailSubject === 'Nouvelle commande #42'
            && $mail->htmlBody === null
            && $mail->textBody === 'Une nouvelle commande vient d\'arriver.';
    });

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('$context->mail rejects invalid recipients, header injection, excessive recipients, and per-invocation limits', function () {
    Mail::fake();

    $app = App::factory()->create();
    RateLimiter::clear("zenbase-fn-mail:{$app->id}");

    // 1. Header injection via CR/LF in subject
    $app->functions()->create([
        'name' => 'mail-header-injection',
        'code' => <<<'PHP'
return function ($event, $context) {
    $context->mail->send([
        'to' => 'alice@example.com',
        'subject' => "Hello\r\nBcc: attacker@evil.com",
        'text' => 'Body',
    ]);
};
PHP,
        'is_active' => true,
    ]);

    $this->postJson('/api/v1/functions/mail-header-injection/invoke', [], [
        'X-Zenbase-Api-Key' => $app->public_key,
    ])
        ->assertStatus(500)
        ->assertJsonPath('data', null);

    // 2. Too many recipients (> 10)
    $app->functions()->create([
        'name' => 'mail-too-many-recipients',
        'code' => <<<'PHP'
return function ($event, $context) {
    $recipients = [];
    for ($i = 1; $i <= 11; $i++) {
        $recipients[] = "user{$i}@example.com";
    }
    $context->mail->send([
        'to' => $recipients,
        'subject' => 'Blast',
        'text' => 'Body',
    ]);
};
PHP,
        'is_active' => true,
    ]);

    $this->postJson('/api/v1/functions/mail-too-many-recipients/invoke', [], [
        'X-Zenbase-Api-Key' => $app->public_key,
    ])->assertStatus(500);

    // 3. Exceeding max 5 emails per invocation
    $app->functions()->create([
        'name' => 'mail-loop-limit',
        'code' => <<<'PHP'
return function ($event, $context) {
    for ($i = 1; $i <= 6; $i++) {
        $context->mail->send([
            'to' => "user{$i}@example.com",
            'subject' => "Msg {$i}",
            'text' => 'Hi',
        ]);
    }
};
PHP,
        'is_active' => true,
    ]);

    $this->postJson('/api/v1/functions/mail-loop-limit/invoke', [], [
        'X-Zenbase-Api-Key' => $app->public_key,
    ])->assertStatus(500);

    Mail::assertSentCount(5);

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('web functions can call external HTTPS APIs via $context->http with headers, bearer token, and timeout', function () {
    FunctionHttpClient::setDnsResolver(static fn (string $host): array => ['93.184.216.34']);

    Http::fake([
        'https://api.resend.com/emails' => Http::response([
            'id' => 're_123456789',
        ], 201, ['X-Request-Id' => 'req-abc']),
        'https://api.example.com/status*' => Http::response([
            'healthy' => true,
        ], 200),
    ]);

    $app = App::factory()->create();

    $app->functions()->create([
        'name' => 'call-resend-api',
        'code' => <<<'PHP'
return function ($event, $context) {
    $res = $context->http
        ->withToken($context->env['RESEND_API_KEY'])
        ->withHeaders(['X-Idempotency-Key' => 'idem-001'])
        ->timeout(3)
        ->post('https://api.resend.com/emails', [
            'from' => 'noreply@example.com',
            'to' => [$event['payload']['email']],
            'subject' => 'Bienvenue via Resend',
            'html' => '<p>Hello</p>',
        ]);

    // Ensure fluent headers/token did not leak to base $context->http instance
    $statusCheck = $context->http->get('https://api.example.com/status', ['verbose' => '1']);

    return [
        'status' => $res['ok'] ? 201 : 502,
        'data' => [
            'email_id' => $res['json']['id'] ?? null,
            'request_id' => $res['headers']['x-request-id'][0] ?? null,
            'healthy' => $statusCheck['json']['healthy'] ?? false,
        ],
    ];
};
PHP,
        'env_variables' => ['RESEND_API_KEY' => 're_secret_test_key'],
        'is_active' => true,
    ]);

    $response = $this->postJson('/api/v1/functions/call-resend-api/invoke', [
        'email' => 'bob@example.com',
    ], ['X-Zenbase-Api-Key' => $app->public_key])->assertCreated();

    expect($response->json('data.email_id'))->toBe('re_123456789');
    expect($response->json('data.request_id'))->toBe('req-abc');
    expect($response->json('data.healthy'))->toBeTrue();

    Http::assertSent(function (HttpClientRequest $request): bool {
        return $request->url() === 'https://api.resend.com/emails'
            && $request->hasHeader('Authorization', 'Bearer re_secret_test_key')
            && $request->hasHeader('X-Idempotency-Key', 'idem-001')
            && $request['to'] === ['bob@example.com'];
    });

    Http::assertSent(function (HttpClientRequest $request): bool {
        return str_starts_with($request->url(), 'https://api.example.com/status')
            && ! $request->hasHeader('Authorization');
    });

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('$context->http blocks SSRF targets including non-HTTPS, private IPs, cloud metadata, DNS rebinding, and request limits', function () {
    Http::fake();

    $client = new FunctionHttpClient;

    $forbiddenUrls = [
        'http://api.example.com/data',
        'https://api.example.com:8080/data',
        'https://user:pass@api.example.com/data',
        'https://localhost/secret',
        'https://sub.localhost/secret',
        'https://internal.local/secret',
        'https://metadata.google.internal/computeMetadata/v1/',
        'https://127.0.0.1/admin',
        'https://10.0.0.5/internal',
        'https://172.16.0.10/internal',
        'https://192.168.1.1/router',
        'https://169.254.169.254/latest/meta-data/',
        'https://100.64.0.1/cgnat',
        'https://[::1]/loopback',
        'https://[::ffff:127.0.0.1]/mapped',
    ];

    foreach ($forbiddenUrls as $url) {
        expect(fn () => $client->get($url))
            ->toThrow(InvalidArgumentException::class);
    }

    // DNS resolving to a private/metadata IP must be rejected
    FunctionHttpClient::setDnsResolver(static fn (string $host): array => ['169.254.169.254']);
    expect(fn () => $client->get('https://rebind.example.com/hook'))
        ->toThrow(InvalidArgumentException::class);

    // Host header override must be rejected
    expect(fn () => $client->withHeaders(['Host' => 'internal.corp']))
        ->toThrow(InvalidArgumentException::class);

    // Max 5 HTTP requests per invocation across cloned instances
    FunctionHttpClient::setDnsResolver(static fn (string $host): array => ['93.184.216.34']);
    $scopedClient = new FunctionHttpClient;
    for ($i = 1; $i <= 5; $i++) {
        $scopedClient->withHeaders(['X-Call' => (string) $i])->get('https://api.example.com/ping');
    }
    expect(fn () => $scopedClient->get('https://api.example.com/ping'))
        ->toThrow(InvalidArgumentException::class);

    Http::assertSentCount(5);
});

test('$context->mail and $context->http enforce per-application customized rate limits', function () {
    Mail::fake();
    Http::fake([
        'https://api.example.com/*' => Http::response(['ok' => true], 200),
    ]);
    FunctionHttpClient::setDnsResolver(static fn (string $host): array => ['93.184.216.34']);

    $app = App::factory()->create([
        'settings' => [
            'rate_limits' => [
                'enabled' => true,
                'function_mail_per_minute' => 10,
                'function_mail_per_invocation' => 2,
                'function_mail_max_recipients' => 2,
                'function_http_per_invocation' => 2,
                'function_http_timeout_seconds' => 2,
            ],
        ],
    ]);

    RateLimiter::clear("zenbase-fn-mail:{$app->id}");

    // Exceeding customized mail_per_invocation (2) fails on 3rd send
    $app->functions()->create([
        'name' => 'custom-mail-limit',
        'code' => <<<'PHP'
return function ($event, $context) {
    for ($i = 1; $i <= 3; $i++) {
        $context->mail->send([
            'to' => "u{$i}@example.com",
            'subject' => "Mail {$i}",
            'text' => 'Test',
        ]);
    }
};
PHP,
        'is_active' => true,
    ]);

    $this->postJson('/api/v1/functions/custom-mail-limit/invoke', [], [
        'X-Zenbase-Api-Key' => $app->public_key,
    ])->assertStatus(500);

    Mail::assertSentCount(2);

    // Exceeding customized http_per_invocation (2) fails on 3rd request
    $app->functions()->create([
        'name' => 'custom-http-limit',
        'code' => <<<'PHP'
return function ($event, $context) {
    for ($i = 1; $i <= 3; $i++) {
        $context->http->get('https://api.example.com/ping');
    }
};
PHP,
        'is_active' => true,
    ]);

    $this->postJson('/api/v1/functions/custom-http-limit/invoke', [], [
        'X-Zenbase-Api-Key' => $app->public_key,
    ])->assertStatus(500);

    Http::assertSentCount(2);

    app(TenantManagerService::class)->deleteDatabase($app);
});
