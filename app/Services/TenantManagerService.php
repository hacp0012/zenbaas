<?php

namespace App\Services;

use App\Models\App;
use Illuminate\Database\Connection;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TenantManagerService
{
    /**
     * Get the absolute path to the tenant SQLite database file for the given app.
     */
    public function getDatabasePath(App $app): string
    {
        $customPath = $app->database_config['database'] ?? null;

        if (is_string($customPath) && $customPath !== '') {
            return $customPath;
        }

        $directory = storage_path('app/tenants');

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        return $directory.DIRECTORY_SEPARATOR."app_{$app->id}.sqlite";
    }

    /**
     * Get the size in bytes of the tenant SQLite database file.
     */
    public function getDatabaseSizeBytes(App $app): int
    {
        $path = $this->getDatabasePath($app);

        if (! file_exists($path)) {
            return 0;
        }

        return (int) filesize($path);
    }

    /**
     * Provision and connect to the isolated SQLite database for the given application.
     */
    public function connect(App $app): Connection
    {
        $dbPath = $this->getDatabasePath($app);
        $isNewFile = ! file_exists($dbPath);

        if ($isNewFile) {
            $dir = dirname($dbPath);
            if (! is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            touch($dbPath);
        }

        Config::set('database.connections.tenant', [
            'driver' => 'sqlite',
            'database' => $dbPath,
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]);

        DB::purge('tenant');
        $connection = DB::connection('tenant');

        $this->ensureSchemaInitialized();

        return $connection;
    }

    /**
     * Alias matching the conceptual method name from the architecture specification.
     */
    public function setTenantDatabase(App $app): Connection
    {
        return $this->connect($app);
    }

    /**
     * Ensure that the tenant SQLite database has the required tables (`collections`, `records`, `auth_users`).
     */
    public function ensureSchemaInitialized(): void
    {
        $schema = Schema::connection('tenant');

        if (! $schema->hasTable('collections')) {
            $schema->create('collections', function (Blueprint $table): void {
                $table->id();
                $table->string('name')->unique();
                $table->json('schema')->nullable();
                $table->timestamps();
            });
        } elseif (! $schema->hasColumn('collections', 'schema')) {
            $schema->table('collections', function (Blueprint $table): void {
                $table->json('schema')->nullable();
            });
        }

        if (! $schema->hasTable('records')) {
            $schema->create('records', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('collection')->index();
                $table->json('data');
                $table->timestamps();

                $table->index(['collection', 'created_at']);
            });
        }

        if (! $schema->hasTable('auth_users')) {
            $schema->create('auth_users', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('name')->nullable();
                $table->string('email')->unique();
                $table->string('password_hash')->nullable();
                $table->string('auth_method')->default('password');
                $table->boolean('is_blocked')->default(false);
                $table->string('otp_code')->nullable();
                $table->timestamp('otp_expires_at')->nullable();
                $table->string('access_token')->nullable()->index();
                $table->timestamps();
            });
        } elseif (! $schema->hasColumn('auth_users', 'name')) {
            $schema->table('auth_users', function (Blueprint $table): void {
                $table->string('name')->nullable();
            });
        }
    }

    /**
     * Delete the tenant SQLite database file when an application is removed.
     */
    public function deleteDatabase(App $app): void
    {
        $dbPath = $this->getDatabasePath($app);

        DB::purge('tenant');

        if (file_exists($dbPath)) {
            @unlink($dbPath);
        }
    }
}
