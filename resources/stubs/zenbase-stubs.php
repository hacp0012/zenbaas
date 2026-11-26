<?php

/**
 * Fichier de stub pour l'autocomplétion (IntelliSense) dans l'éditeur de code
 * lors de l'écriture des Web Functions PHP sur Zenbase.
 */

namespace Zenbase;

class CollectionQueryBuilder
{
    public function where(string $field, string $operator, mixed $value = null): self
    {
        return $this;
    }

    public function orderBy(string $field, string $direction = 'asc'): self
    {
        return $this;
    }

    public function limit(int $limit): self
    {
        return $this;
    }

    public function offset(int $offset): self
    {
        return $this;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function get(): array
    {
        return [];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(string $id): ?array
    {
        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(array $data): array
    {
        return [];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>|null
     */
    public function update(string $id, array $data): ?array
    {
        return null;
    }

    public function delete(string $id): bool
    {
        return true;
    }
}

class DatabaseManager
{
    public function collection(string $name): CollectionQueryBuilder
    {
        return new CollectionQueryBuilder;
    }

    /**
     * @return array<int, array{name: string, count: int, created_at: string|null}>
     */
    public function listCollections(): array
    {
        return [];
    }
}

class StorageManager
{
    /**
     * @return array{id: string, url: string, path: string, original_name: string, size: int}
     */
    public function upload(string $path, string $contents, string $mimeType = 'text/plain'): array
    {
        return ['id' => '', 'url' => '', 'path' => '', 'original_name' => '', 'size' => 0];
    }

    /**
     * @return array{id: string, url: string, path: string, original_name: string, size: int}
     */
    public function put(string $path, string $contents, string $mimeType = 'text/plain'): array
    {
        return ['id' => '', 'url' => '', 'path' => '', 'original_name' => '', 'size' => 0];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list(?string $folder = null): array
    {
        return [];
    }

    public function delete(string $fileIdOrPath): bool
    {
        return true;
    }
}

class AuthContext
{
    public function check(): bool
    {
        return false;
    }

    /**
     * @return array{id: string, email: string, auth_method: string, created_at: string|null}|null
     */
    public function user(): ?array
    {
        return null;
    }

    public function id(): ?string
    {
        return null;
    }

    public function email(): ?string
    {
        return null;
    }
}

class MailManager
{
    /**
     * Envoie immédiatement un e-mail depuis une Web Function (max 5/invocation, 10 destinataires, 30/min/app).
     *
     * @param  array{
     *     to: string|array<int, string>,
     *     subject: string,
     *     html?: string|null,
     *     text?: string|null,
     *     cc?: string|array<int, string>|null,
     *     bcc?: string|array<int, string>|null,
     *     reply_to?: string|null,
     *     from_name?: string|null
     * }  $options
     * @return array{sent: bool, queued: bool, to: array<int, string>, cc: array<int, string>, bcc: array<int, string>, subject: string}
     */
    public function send(array $options): array
    {
        return ['sent' => true, 'queued' => false, 'to' => [], 'cc' => [], 'bcc' => [], 'subject' => ''];
    }

    /**
     * Met en file d'attente un e-mail de manière asynchrone depuis une Web Function.
     *
     * @param  array{
     *     to: string|array<int, string>,
     *     subject: string,
     *     html?: string|null,
     *     text?: string|null,
     *     cc?: string|array<int, string>|null,
     *     bcc?: string|array<int, string>|null,
     *     reply_to?: string|null,
     *     from_name?: string|null
     * }  $options
     * @return array{sent: bool, queued: bool, to: array<int, string>, cc: array<int, string>, bcc: array<int, string>, subject: string}
     */
    public function queue(array $options): array
    {
        return ['sent' => false, 'queued' => true, 'to' => [], 'cc' => [], 'bcc' => [], 'subject' => ''];
    }
}

class HttpClient
{
    /**
     * Retourne une nouvelle instance avec des en-têtes HTTP additionnels.
     *
     * @param  array<string, string|int|float>  $headers
     */
    public function withHeaders(array $headers): self
    {
        return $this;
    }

    /**
     * Retourne une nouvelle instance avec un en-tête Authorization (Bearer par défaut).
     */
    public function withToken(string $token, string $type = 'Bearer'): self
    {
        return $this;
    }

    /**
     * Retourne une nouvelle instance avec un délai d'attente personnalisé (1 à 4 secondes).
     */
    public function timeout(int $seconds): self
    {
        return $this;
    }

    /**
     * Exécute une requête HTTPS GET sécurisée (anti-SSRF).
     *
     * @param  array<string, mixed>  $query
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function get(string $url, array $query = []): array
    {
        return ['status' => 200, 'ok' => true, 'body' => '', 'json' => null, 'headers' => []];
    }

    /**
     * Exécute une requête HTTPS POST sécurisée (anti-SSRF).
     *
     * @param  array<string, mixed>|string  $data
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function post(string $url, array|string $data = []): array
    {
        return ['status' => 200, 'ok' => true, 'body' => '', 'json' => null, 'headers' => []];
    }

    /**
     * Exécute une requête HTTPS PUT sécurisée (anti-SSRF).
     *
     * @param  array<string, mixed>|string  $data
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function put(string $url, array|string $data = []): array
    {
        return ['status' => 200, 'ok' => true, 'body' => '', 'json' => null, 'headers' => []];
    }

    /**
     * Exécute une requête HTTPS PATCH sécurisée (anti-SSRF).
     *
     * @param  array<string, mixed>|string  $data
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function patch(string $url, array|string $data = []): array
    {
        return ['status' => 200, 'ok' => true, 'body' => '', 'json' => null, 'headers' => []];
    }

    /**
     * Exécute une requête HTTPS DELETE sécurisée (anti-SSRF).
     *
     * @param  array<string, mixed>|string  $data
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function delete(string $url, array|string $data = []): array
    {
        return ['status' => 200, 'ok' => true, 'body' => '', 'json' => null, 'headers' => []];
    }

    /**
     * Exécute une requête HTTPS générique sécurisée (GET, POST, PUT, PATCH, DELETE, HEAD).
     *
     * @param  array<string, mixed>  $options
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function request(string $method, string $url, array $options = []): array
    {
        return ['status' => 200, 'ok' => true, 'body' => '', 'json' => null, 'headers' => []];
    }
}

class Context
{
    public DatabaseManager $database;

    public StorageManager $storage;

    /**
     * @var array<string, string>
     */
    public array $env;

    public AuthContext $auth;

    public MailManager $mail;

    public HttpClient $http;
}
