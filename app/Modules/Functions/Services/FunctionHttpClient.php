<?php

namespace App\Modules\Functions\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use stdClass;

class FunctionHttpClient
{
    public const MAX_REQUESTS_PER_INVOCATION = 5;

    public const DEFAULT_TIMEOUT_SECONDS = 3;

    public const MAX_TIMEOUT_SECONDS = 4;

    public const MAX_RESPONSE_BODY_BYTES = 524_288;

    /**
     * Hostnames always rejected by SSRF protection.
     *
     * @var array<int, string>
     */
    private const BLOCKED_HOSTNAMES = [
        'localhost',
        'localhost.localdomain',
        'ip6-localhost',
        'ip6-loopback',
        'metadata',
        'metadata.google.internal',
        'instance-data',
    ];

    /**
     * Hostname suffixes always rejected by SSRF protection.
     *
     * @var array<int, string>
     */
    private const BLOCKED_HOST_SUFFIXES = [
        '.localhost',
        '.local',
        '.localdomain',
        '.internal',
        '.home.arpa',
        '.lan',
    ];

    /**
     * Optional custom DNS resolver (primarily for deterministic testing).
     *
     * @var (callable(string): array<int, string>)|null
     */
    private static $dnsResolver = null;

    /**
     * @var array<string, string>
     */
    private array $headers = [];

    private int $timeoutSeconds = self::DEFAULT_TIMEOUT_SECONDS;

    private int $maxRequestsPerInvocation = self::MAX_REQUESTS_PER_INVOCATION;

    private int $maxTimeoutSeconds = self::MAX_TIMEOUT_SECONDS;

    /**
     * Shared mutable request counter across cloned fluent instances within a single invocation.
     */
    private stdClass $counter;

    public function __construct(
        ?stdClass $counter = null,
        int $maxRequestsPerInvocation = self::MAX_REQUESTS_PER_INVOCATION,
        int $maxTimeoutSeconds = self::MAX_TIMEOUT_SECONDS,
    ) {
        if ($counter === null) {
            $counter = new stdClass;
            $counter->count = 0;
        }

        $this->counter = $counter;
        $this->maxRequestsPerInvocation = max(1, min(25, $maxRequestsPerInvocation));
        $this->maxTimeoutSeconds = max(1, min(self::MAX_TIMEOUT_SECONDS, $maxTimeoutSeconds));
        $this->timeoutSeconds = min(self::DEFAULT_TIMEOUT_SECONDS, $this->maxTimeoutSeconds);
    }

    /**
     * Override DNS resolution in tests (pass null to restore native DNS lookup).
     *
     * @param  (callable(string): array<int, string>)|null  $resolver
     */
    public static function setDnsResolver(?callable $resolver): void
    {
        self::$dnsResolver = $resolver;
    }

    /**
     * Return a new client instance with additional HTTP headers.
     *
     * @param  array<string, string|int|float>  $headers
     */
    public function withHeaders(array $headers): self
    {
        $clone = clone $this;

        foreach ($headers as $name => $value) {
            $cleanName = trim((string) $name);
            if ($cleanName === '') {
                continue;
            }

            if (strtolower($cleanName) === 'host') {
                throw new InvalidArgumentException("L'en-tête HTTP [Host] ne peut pas être surchargé dans \$context->http.");
            }

            $stringValue = (string) $value;
            if (preg_match('/[\r\n]/', $cleanName) === 1 || preg_match('/[\r\n]/', $stringValue) === 1) {
                throw new InvalidArgumentException("Caractères de retour à la ligne interdits dans l'en-tête HTTP [{$cleanName}].");
            }

            $clone->headers[$cleanName] = $stringValue;
        }

        return $clone;
    }

    /**
     * Return a new client instance with an Authorization Bearer (or custom scheme) token.
     */
    public function withToken(string $token, string $type = 'Bearer'): self
    {
        $cleanType = trim($type);
        $cleanToken = trim($token);

        if ($cleanType === '' || $cleanToken === '') {
            throw new InvalidArgumentException('Le jeton d\'autorisation fourni à withToken() ne peut pas être vide.');
        }

        return $this->withHeaders([
            'Authorization' => "{$cleanType} {$cleanToken}",
        ]);
    }

    /**
     * Return a new client instance with a custom timeout (clamped between 1 and the configured max timeout).
     */
    public function timeout(int $seconds): self
    {
        $clone = clone $this;
        $clone->timeoutSeconds = max(1, min($seconds, $this->maxTimeoutSeconds));

        return $clone;
    }

    /**
     * Execute an HTTPS GET request.
     *
     * @param  array<string, mixed>  $query
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function get(string $url, array $query = []): array
    {
        return $this->request('GET', $url, ['query' => $query]);
    }

    /**
     * Execute an HTTPS POST request.
     *
     * @param  array<string, mixed>|string  $data
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function post(string $url, array|string $data = []): array
    {
        return $this->request('POST', $url, is_array($data) ? ['json' => $data] : ['body' => $data]);
    }

    /**
     * Execute an HTTPS PUT request.
     *
     * @param  array<string, mixed>|string  $data
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function put(string $url, array|string $data = []): array
    {
        return $this->request('PUT', $url, is_array($data) ? ['json' => $data] : ['body' => $data]);
    }

    /**
     * Execute an HTTPS PATCH request.
     *
     * @param  array<string, mixed>|string  $data
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function patch(string $url, array|string $data = []): array
    {
        return $this->request('PATCH', $url, is_array($data) ? ['json' => $data] : ['body' => $data]);
    }

    /**
     * Execute an HTTPS DELETE request.
     *
     * @param  array<string, mixed>|string  $data
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function delete(string $url, array|string $data = []): array
    {
        return $this->request('DELETE', $url, is_array($data) ? ['json' => $data] : ['body' => $data]);
    }

    /**
     * Execute a validated HTTPS request with strict anti-SSRF protection.
     *
     * @param  array<string, mixed>  $options
     * @return array{status: int, ok: bool, body: string, json: mixed, headers: array<string, array<int, string>>}
     */
    public function request(string $method, string $url, array $options = []): array
    {
        $currentCount = is_int($this->counter->count ?? null) ? $this->counter->count : 0;
        if ($currentCount >= $this->maxRequestsPerInvocation) {
            throw new InvalidArgumentException(
                sprintf('Limite atteinte : une Web Function ne peut pas effectuer plus de %d requêtes HTTP par invocation.', $this->maxRequestsPerInvocation)
            );
        }

        $normalizedMethod = strtoupper(trim($method));
        if (! in_array($normalizedMethod, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'], true)) {
            throw new InvalidArgumentException("Méthode HTTP non autorisée : [{$method}].");
        }

        $this->assertSafeHttpsUrl($url);

        $this->counter->count = $currentCount + 1;

        /** @var PendingRequest $pending */
        $pending = Http::timeout($this->timeoutSeconds)
            ->connectTimeout(min(2, $this->timeoutSeconds))
            ->withoutRedirecting()
            ->withHeaders($this->headers);

        $requestOptions = [];

        if (isset($options['query']) && is_array($options['query']) && $options['query'] !== []) {
            $requestOptions['query'] = $options['query'];
        }

        if (isset($options['json']) && is_array($options['json'])) {
            $requestOptions['json'] = $options['json'];
        } elseif (isset($options['body']) && is_string($options['body'])) {
            $requestOptions['body'] = $options['body'];
        }

        /** @var Response $response */
        $response = $pending->send($normalizedMethod, $url, $requestOptions);

        $rawBody = $response->body();
        if (strlen($rawBody) > self::MAX_RESPONSE_BODY_BYTES) {
            $rawBody = substr($rawBody, 0, self::MAX_RESPONSE_BODY_BYTES);
        }

        $decodedJson = null;
        if ($rawBody !== '') {
            $candidate = json_decode($rawBody, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $decodedJson = $candidate;
            }
        }

        /** @var array<string, array<int, string>> $normalizedHeaders */
        $normalizedHeaders = [];
        foreach ($response->headers() as $headerName => $values) {
            $normalizedHeaders[strtolower((string) $headerName)] = is_array($values)
                ? array_values(array_map(static fn (mixed $v): string => (string) $v, $values))
                : [(string) $values];
        }

        return [
            'status' => $response->status(),
            'ok' => $response->successful(),
            'body' => $rawBody,
            'json' => $decodedJson,
            'headers' => $normalizedHeaders,
        ];
    }

    /**
     * Validate that a target URL uses HTTPS on port 443 and does not point to a local, private, or reserved IP/host.
     *
     * @throws InvalidArgumentException
     */
    public function assertSafeHttpsUrl(string $url): void
    {
        $trimmed = trim($url);
        if ($trimmed === '') {
            throw new InvalidArgumentException("L'URL fournie à \$context->http ne peut pas être vide.");
        }

        $parts = parse_url($trimmed);
        if (! is_array($parts)) {
            throw new InvalidArgumentException("URL invalide : [{$trimmed}].");
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        if ($scheme !== 'https') {
            throw new InvalidArgumentException('Seul le protocole HTTPS est autorisé dans $context->http (protection anti-SSRF).');
        }

        if (isset($parts['user']) || isset($parts['pass'])) {
            throw new InvalidArgumentException("Les identifiants intégrés dans l'URL sont interdits dans \$context->http.");
        }

        if (isset($parts['port']) && (int) $parts['port'] !== 443) {
            throw new InvalidArgumentException('Seul le port HTTPS standard (443) est autorisé dans $context->http.');
        }

        $rawHost = strtolower(trim((string) ($parts['host'] ?? ''), " \t\n\r\0\x0B."));
        $host = trim($rawHost, '[]');

        if ($host === '') {
            throw new InvalidArgumentException("Nom d'hôte manquant dans l'URL [{$trimmed}].");
        }

        if (in_array($host, self::BLOCKED_HOSTNAMES, true)) {
            throw new InvalidArgumentException("Hôte interdit par la protection anti-SSRF : [{$host}].");
        }

        foreach (self::BLOCKED_HOST_SUFFIXES as $suffix) {
            if (str_ends_with($host, $suffix)) {
                throw new InvalidArgumentException("Hôte interne interdit par la protection anti-SSRF : [{$host}].");
            }
        }

        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            if (! self::isPublicIp($host)) {
                throw new InvalidArgumentException("Adresse IP privée, locale ou réservée interdite par la protection anti-SSRF : [{$host}].");
            }

            return;
        }

        $resolvedIps = $this->resolveHostIps($host);

        if ($resolvedIps === []) {
            // Allow offline unit/feature tests that stub outbound requests via Http::fake()
            if (app()->runningUnitTests() && Http::getFacadeRoot() !== null && method_exists(Http::getFacadeRoot(), 'recording') && self::$dnsResolver === null) {
                return;
            }

            throw new InvalidArgumentException("Impossible de résoudre le nom d'hôte [{$host}].");
        }

        foreach ($resolvedIps as $ip) {
            if (! self::isPublicIp($ip)) {
                throw new InvalidArgumentException(
                    "Requête bloquée par la protection anti-SSRF : l'hôte [{$host}] résout vers une adresse IP privée ou réservée ({$ip})."
                );
            }
        }
    }

    /**
     * Determine whether an IPv4 or IPv6 address is publicly routable (not loopback, private, link-local, CGNAT, or reserved).
     */
    public static function isPublicIp(string $ip): bool
    {
        $cleanIp = trim($ip, '[]');

        if (filter_var($cleanIp, FILTER_VALIDATE_IP) === false) {
            return false;
        }

        // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
        if (filter_var($cleanIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false) {
            $packed = @inet_pton($cleanIp);
            if (is_string($packed) && strlen($packed) === 16 && substr($packed, 0, 12) === "\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff") {
                $mappedIpv4 = inet_ntop(substr($packed, 12, 4));
                if (is_string($mappedIpv4)) {
                    return self::isPublicIp($mappedIpv4);
                }
            }
        }

        if (filter_var($cleanIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return false;
        }

        // Explicitly block Carrier-Grade NAT (100.64.0.0/10) and Benchmarking (198.18.0.0/15)
        if (filter_var($cleanIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
            $long = ip2long($cleanIp);
            if ($long === false) {
                return false;
            }

            $unsigned = $long & 0xFFFFFFFF;
            if (($unsigned >= 0x64400000 && $unsigned <= 0x647FFFFF) || ($unsigned >= 0xC6120000 && $unsigned <= 0xC613FFFF)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Resolve IPv4 and IPv6 addresses for a given domain name.
     *
     * @return array<int, string>
     */
    private function resolveHostIps(string $host): array
    {
        if (self::$dnsResolver !== null) {
            $resolved = (self::$dnsResolver)($host);

            return array_values(array_filter($resolved, static fn (string $ip): bool => $ip !== ''));
        }

        $ips = [];

        $records = @dns_get_record($host, DNS_A | DNS_AAAA);
        if (is_array($records)) {
            foreach ($records as $record) {
                if (isset($record['ip']) && is_string($record['ip'])) {
                    $ips[] = $record['ip'];
                }
                if (isset($record['ipv6']) && is_string($record['ipv6'])) {
                    $ips[] = $record['ipv6'];
                }
            }
        }

        if ($ips === []) {
            $ipv4List = @gethostbynamel($host);
            if (is_array($ipv4List)) {
                foreach ($ipv4List as $ipv4) {
                    $ips[] = $ipv4;
                }
            }
        }

        return array_values(array_unique($ips));
    }
}
