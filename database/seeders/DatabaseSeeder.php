<?php

namespace Database\Seeders;

use App\Models\App;
use App\Models\User;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Services\TenantManagerService;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@zenbase.local'],
            [
                'name' => 'Super Admin Zenbase',
                'password' => 'password',
                'is_admin' => true,
                'is_suspended' => false,
                'email_verified_at' => now(),
            ]
        );

        $client = User::query()->firstOrCreate(
            ['email' => 'client@zenbase.local'],
            [
                'name' => 'Alex Développeur',
                'password' => 'password',
                'is_admin' => false,
                'is_suspended' => false,
                'email_verified_at' => now(),
            ]
        );

        $demoApp = App::query()->firstOrCreate(
            [
                'user_id' => $client->id,
                'name' => 'ZenShop E-Commerce',
            ],
            [
                'description' => 'Application e-commerce de démonstration propulsée par Zenbase BaaS.',
                'public_key' => App::generatePublicKey(),
                'secret_key' => App::generateSecretKey(),
                'settings' => ['rate_limit' => 120],
                'api_calls_count' => 42,
            ]
        );

        $demoApp->corsOrigins()->firstOrCreate(['origin' => 'http://localhost:3000']);
        $demoApp->corsOrigins()->firstOrCreate(['origin' => 'https://zenshop.example.com']);

        $demoApp->functions()->firstOrCreate(
            ['name' => 'send-welcome-email'],
            [
                'description' => 'Crée une notification de bienvenue dans la base SQLite de l\'application.',
                'code' => <<<'PHP'
return function($event, $context) {
    $name = $event['payload']['name'] ?? 'Utilisateur';

    $newItem = $context->database->collection('notifications')->create([
        'message' => "Bienvenue, {$name} !",
        'read' => false,
        'created_at' => time(),
    ]);

    return [
        'status' => 201,
        'data' => [
            'success' => true,
            'item_id' => $newItem['id'],
        ],
    ];
};
PHP,
                'env_variables' => ['MAIL_FROM' => 'noreply@zenshop.local'],
                'logs' => [],
                'is_active' => true,
            ]
        );

        $tenantManager = app(TenantManagerService::class);
        $databaseEngine = app(NoSqlDatabaseEngine::class);

        $tenantManager->connect($demoApp);

        if (count($databaseEngine->listCollections()) === 0) {
            $databaseEngine->create('products', [
                'name' => 'Casque Bluetooth Pro',
                'price' => 79.99,
                'inStock' => true,
            ]);
            $databaseEngine->create('products', [
                'name' => 'Clavier Mécanique Sans-Fil',
                'price' => 129.00,
                'inStock' => true,
            ]);
            $databaseEngine->create('todos', [
                'title' => 'Intégrer @zenbase/sdk dans le frontend',
                'completed' => false,
            ]);
        }
    }
}
