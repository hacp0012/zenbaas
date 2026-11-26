<?php

namespace App\Modules\Functions\Services;

use App\Models\App;
use App\Modules\Auth\Models\TenantUser;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Modules\Storage\Services\StorageManagerService;

class ZenbaseFunctionContext
{
    public NoSqlDatabaseEngine $database;

    public object $storage;

    /**
     * @var array<string, string>
     */
    public array $env;

    public object $auth;

    public FunctionMailService $mail;

    public FunctionHttpClient $http;

    /**
     * @param  array<string, string>  $envVariables
     */
    public function __construct(
        App $app,
        NoSqlDatabaseEngine $databaseEngine,
        StorageManagerService $storageManager,
        array $envVariables = [],
        ?TenantUser $tenantUser = null,
    ) {
        $rateLimits = $app->rateLimitSettings();

        $this->database = $databaseEngine;
        $this->env = $envVariables;
        $this->mail = new FunctionMailService($app);
        $this->http = new FunctionHttpClient(
            maxRequestsPerInvocation: $rateLimits['function_http_per_invocation'],
            maxTimeoutSeconds: $rateLimits['function_http_timeout_seconds'],
        );

        $this->storage = new class($app, $storageManager)
        {
            public function __construct(
                private App $app,
                private StorageManagerService $storageManager,
            ) {}

            /**
             * Store string content as a file in the application's storage.
             *
             * @return array<string, mixed>
             */
            public function upload(string $path, string $contents, string $mimeType = 'text/plain'): array
            {
                $file = $this->storageManager->putContent($this->app, $path, $contents, $mimeType);

                return [
                    'id' => $file->id,
                    'url' => $file->url,
                    'path' => $file->path,
                    'original_name' => $file->original_name,
                    'size' => $file->size,
                ];
            }

            /**
             * Alias for `upload()`.
             *
             * @return array<string, mixed>
             */
            public function put(string $path, string $contents, string $mimeType = 'text/plain'): array
            {
                return $this->upload($path, $contents, $mimeType);
            }

            /**
             * List files in the application's storage.
             *
             * @return array<int, array<string, mixed>>
             */
            public function list(?string $folder = null): array
            {
                return $this->storageManager->list($this->app, $folder)->toArray();
            }

            /**
             * Delete a file by ID or path.
             */
            public function delete(string $fileIdOrPath): bool
            {
                return $this->storageManager->delete($this->app, $fileIdOrPath);
            }
        };

        $this->auth = new class($tenantUser)
        {
            public function __construct(private ?TenantUser $user) {}

            public function check(): bool
            {
                return $this->user !== null;
            }

            /**
             * @return array<string, mixed>|null
             */
            public function user(): ?array
            {
                if (! $this->user) {
                    return null;
                }

                return [
                    'id' => $this->user->id,
                    'email' => $this->user->email,
                    'auth_method' => $this->user->auth_method,
                    'created_at' => $this->user->created_at?->toIso8601String(),
                ];
            }

            public function id(): ?string
            {
                return $this->user?->id;
            }

            public function email(): ?string
            {
                return $this->user?->email;
            }
        };
    }
}
