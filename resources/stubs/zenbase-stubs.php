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

class Context
{
    public DatabaseManager $database;

    public StorageManager $storage;

    /**
     * @var array<string, string>
     */
    public array $env;

    public AuthContext $auth;
}
