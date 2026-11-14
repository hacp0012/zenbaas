<?php

use App\Mail\TenantOtpMail;
use App\Models\App;
use App\Models\User;
use App\Services\TenantManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('sdk api returns 401 when api key is missing or invalid', function () {
    $this->getJson('/api/v1/collections')
        ->assertUnauthorized();

    $this->getJson('/api/v1/collections', ['X-Zenbase-Api-Key' => 'zb_pub_invalid'])
        ->assertUnauthorized();
});

test('dynamic cors middleware enforces allowed origins for public keys and allows secret keys', function () {
    $app = App::factory()->create();
    $app->corsOrigins()->create(['origin' => 'https://allowed-app.com']);

    $this->getJson('/api/v1/collections', [
        'X-Zenbase-Api-Key' => $app->public_key,
        'Origin' => 'https://unauthorized-site.com',
    ])->assertForbidden();

    $this->getJson('/api/v1/collections', [
        'X-Zenbase-Api-Key' => $app->public_key,
        'Origin' => 'https://allowed-app.com',
    ])
        ->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', 'https://allowed-app.com');

    $this->getJson('/api/v1/collections', [
        'X-Zenbase-Api-Key' => $app->secret_key,
        'Origin' => 'https://backend-worker.internal',
    ])->assertOk();

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('database module stores, queries with sqlite json1 filters, updates, deletes, and isolates records per app', function () {
    $appA = App::factory()->create();
    $appB = App::factory()->create();

    // Insert 2 products into App A
    $createResponse = $this->postJson('/api/v1/collections/products/records', [
        'name' => 'Casque Bluetooth',
        'price' => 79.99,
        'inStock' => true,
    ], ['X-Zenbase-Api-Key' => $appA->public_key])
        ->assertCreated();

    $productId = $createResponse->json('data.id');

    $this->postJson('/api/v1/collections/products/records', [
        'name' => 'Écran 4K',
        'price' => 399.00,
        'inStock' => false,
    ], ['X-Zenbase-Api-Key' => $appA->public_key])
        ->assertCreated();

    // Filter with SQLite JSON1 where inStock == true
    $filtered = $this->getJson('/api/v1/collections/products/records?where='.urlencode(json_encode([
        ['field' => 'inStock', 'operator' => '==', 'value' => true],
    ])), ['X-Zenbase-Api-Key' => $appA->public_key])
        ->assertOk();

    expect($filtered->json('data'))->toHaveCount(1);
    expect($filtered->json('data.0.name'))->toBe('Casque Bluetooth');

    // Verify App B cannot see App A's products
    $appBRecords = $this->getJson('/api/v1/collections/products/records', [
        'X-Zenbase-Api-Key' => $appB->public_key,
    ])->assertOk();

    expect($appBRecords->json('data'))->toBeEmpty();

    // Update product in App A
    $this->patchJson("/api/v1/collections/products/records/{$productId}", [
        'price' => 69.99,
    ], ['X-Zenbase-Api-Key' => $appA->public_key])
        ->assertOk()
        ->assertJsonPath('data.price', 69.99);

    // Delete product in App A
    $this->deleteJson("/api/v1/collections/products/records/{$productId}", [], [
        'X-Zenbase-Api-Key' => $appA->public_key,
    ])->assertOk();

    app(TenantManagerService::class)->deleteDatabase($appA);
    app(TenantManagerService::class)->deleteDatabase($appB);
});

test('auth module supports email/password signup, signin, and email otp verification', function () {
    Mail::fake();

    $app = App::factory()->create();
    $headers = ['X-Zenbase-Api-Key' => $app->public_key];

    // 1. Sign up with email & password
    $signUp = $this->postJson('/api/v1/auth/signup', [
        'email' => 'alice@example.com',
        'password' => 'secretPassword',
    ], $headers)->assertCreated();

    expect($signUp->json('data.token'))->toStartWith('zb_token_');

    // 2. Sign in with password
    $signIn = $this->postJson('/api/v1/auth/signin', [
        'email' => 'alice@example.com',
        'password' => 'secretPassword',
    ], $headers)->assertOk();

    $token = $signIn->json('data.token');

    // 3. Get current authenticated tenant user
    $this->getJson('/api/v1/auth/user', [
        ...$headers,
        'X-Zenbase-User-Token' => $token,
    ])
        ->assertOk()
        ->assertJsonPath('data.user.email', 'alice@example.com');

    // 4. Send OTP code by email
    $this->postJson('/api/v1/auth/otp/send', [
        'email' => 'bob@example.com',
    ], $headers)->assertOk();

    $sentOtpCode = null;
    Mail::assertSent(TenantOtpMail::class, function (TenantOtpMail $mail) use (&$sentOtpCode): bool {
        $sentOtpCode = $mail->otpCode;

        return $mail->hasTo('bob@example.com');
    });

    expect($sentOtpCode)->toHaveLength(6);

    // 5. Verify OTP code
    $otpVerify = $this->postJson('/api/v1/auth/otp/verify', [
        'email' => 'bob@example.com',
        'code' => $sentOtpCode,
    ], $headers)->assertOk();

    expect($otpVerify->json('data.token'))->toStartWith('zb_token_');

    // Verify OTP cannot be reused a second time
    $this->postJson('/api/v1/auth/otp/verify', [
        'email' => 'bob@example.com',
        'code' => $sentOtpCode,
    ], $headers)->assertUnauthorized();

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('storage module uploads, lists, and deletes isolated files via the sdk api', function () {
    Storage::fake('public');

    $app = App::factory()->create();
    $headers = ['X-Zenbase-Api-Key' => $app->public_key];

    $upload = $this->postJson('/api/v1/storage/upload', [
        'file' => UploadedFile::fake()->create('avatar.png', 120, 'image/png'),
        'path' => 'avatars/user.png',
    ], $headers)->assertCreated();

    $fileId = $upload->json('data.id');
    expect($upload->json('url'))->toContain('tenants/'.$app->id.'/avatars/user.png');
    expect($upload->json('fileUrl'))->toContain('tenants/'.$app->id.'/avatars/user.png');

    $list = $this->getJson('/api/v1/storage/files', $headers)->assertOk();
    expect($list->json('data'))->toHaveCount(1);

    $this->deleteJson("/api/v1/storage/files/{$fileId}", [], $headers)->assertOk();

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('functions module executes serverless php closures with database and env context via sdk api', function () {
    $app = App::factory()->create();

    $app->functions()->create([
        'name' => 'send-welcome-email',
        'description' => 'Creates a welcome notification in tenant SQLite DB',
        'code' => <<<'PHP'
return function($event, $context) {
    $name = $event['payload']['name'] ?? 'Invité';
    $sender = $context->env['SENDER'] ?? 'Zenbase';

    $record = $context->database->collection('notifications')->create([
        'message' => "Bienvenue {$name} de la part de {$sender}",
        'read' => false,
    ]);

    return [
        'status' => 201,
        'data' => [
            'success' => true,
            'item_id' => $record['id'],
            'message' => $record['message'],
        ],
    ];
};
PHP,
        'env_variables' => ['SENDER' => 'Équipe Zenbase'],
        'logs' => [],
        'is_active' => true,
    ]);

    $response = $this->postJson('/api/v1/functions/send-welcome-email/invoke', [
        'name' => 'Alex',
    ], ['X-Zenbase-Api-Key' => $app->public_key])
        ->assertCreated();

    expect($response->json('data.success'))->toBeTrue();
    expect($response->json('data.message'))->toBe('Bienvenue Alex de la part de Équipe Zenbase');

    // Verify record was persisted in the tenant SQLite database
    $notifications = $this->getJson('/api/v1/collections/notifications/records', [
        'X-Zenbase-Api-Key' => $app->public_key,
    ])->assertOk();

    expect($notifications->json('data'))->toHaveCount(1);

    app(TenantManagerService::class)->deleteDatabase($app);
});
