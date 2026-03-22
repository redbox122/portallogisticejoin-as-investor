<?php

namespace App\Services;

use App\Models\SadqNafathRequest;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Sadq Tasheel — Integration Nafath (Hash Sign).
 * Headers only: thumbPrint, accountId, Content-Type (no OAuth / Bearer).
 */
class SadqService
{
    private const TOKEN_CACHE_KEY = 'sadq_access_token';
    private const WEBHOOK_CACHE_KEY = 'sadq_webhook_registered';

    public function nafathAuthPath(): string
    {
        $path = (string) config('services.sadq.nafath_auth_path', '/Authentication/Authority/IntegrationNafathAuth');

        return str_starts_with($path, '/') ? $path : '/'.$path;
    }

    protected function baseUrl(): string
    {
        return rtrim((string) config('services.sadq.base_url'), '/');
    }

    protected function timeoutSeconds(): int
    {
        return max(5, (int) config('services.sadq.timeout', 30));
    }

    protected function tokenPath(): string
    {
        $path = (string) config('services.sadq.token_path', '/Authentication/Authority/Token');

        return str_starts_with($path, '/') ? $path : '/'.$path;
    }

    protected function tokenCacheTtl(): int
    {
        return max(60, (int) config('services.sadq.token_cache_ttl', 1800));
    }

    protected function webhookUrl(): string
    {
        return rtrim((string) config('app.url'), '/').'/api/webhook/sadq';
    }

    protected function addWebhookPath(): string
    {
        $path = (string) config('services.sadq.add_webhook_path', '/IntegrationService/Configuration/webhook');

        return str_starts_with($path, '/') ? $path : '/'.$path;
    }

    protected function webhookRegisterTtl(): int
    {
        return max(300, (int) config('services.sadq.webhook_register_ttl', 86400));
    }

    /**
     * @return array{
     *     success: bool,
     *     http_status: int,
     *     request_id: string,
     *     national_id: string,
     *     contract_type: ?string,
     *     sadq_response: ?array,
     *     message: ?string
     * }
     */
    public function initiateNafath(string $nationalId, ?string $contractType = null): array
    {
        $nationalId = preg_replace('/\D/', '', $nationalId) ?? '';

        if ($nationalId === '' || ! ctype_digit($nationalId)) {
            return [
                'success' => false,
                'http_status' => 422,
                'request_id' => '',
                'national_id' => $nationalId,
                'contract_type' => $contractType,
                'sadq_response' => null,
                'message' => 'national_id must be numeric.',
            ];
        }

        $accountId = (string) (config('services.sadq.account_id') ?? '');
        $thumbPrint = (string) (config('services.sadq.thumbprint') ?? '');

        if ($accountId === '' || $thumbPrint === '') {
            Log::error('Sadq: missing SADQ_ACCOUNT_ID or SADQ_THUMBPRINT');

            return [
                'success' => false,
                'http_status' => 503,
                'request_id' => '',
                'national_id' => $nationalId,
                'contract_type' => $contractType,
                'sadq_response' => null,
                'message' => 'Sadq not configured.',
            ];
        }

        $webHookUrl = $this->webhookUrl();
        if (filter_var($webHookUrl, FILTER_VALIDATE_URL) === false) {
            Log::error('Sadq: invalid webHookUrl', ['url' => $webHookUrl]);

            return [
                'success' => false,
                'http_status' => 503,
                'request_id' => '',
                'national_id' => $nationalId,
                'contract_type' => $contractType,
                'sadq_response' => null,
                'message' => 'Invalid APP_URL for webhook.',
            ];
        }

        $requestId = Str::uuid()->toString();
        if (! Str::isUuid($requestId)) {
            return [
                'success' => false,
                'http_status' => 500,
                'request_id' => '',
                'national_id' => $nationalId,
                'contract_type' => $contractType,
                'sadq_response' => null,
                'message' => 'UUID generation failed.',
            ];
        }

        $tokenResult = $this->getAccessToken();
        if (! $tokenResult['success']) {
            return [
                'success' => false,
                'http_status' => (int) ($tokenResult['http_status'] ?? 503),
                'request_id' => $requestId,
                'national_id' => $nationalId,
                'contract_type' => $contractType,
                'sadq_response' => null,
                'message' => $tokenResult['message'] ?? 'Unable to obtain Sadq token.',
            ];
        }

        $webhookResult = $this->ensureWebhookRegistered((string) $tokenResult['token'], $webHookUrl);
        if (! $webhookResult['success']) {
            return [
                'success' => false,
                'http_status' => (int) ($webhookResult['http_status'] ?? 503),
                'request_id' => $requestId,
                'national_id' => $nationalId,
                'contract_type' => $contractType,
                'sadq_response' => $webhookResult['response'] ?? null,
                'message' => $webhookResult['message'] ?? 'Sadq webhook registration failed.',
            ];
        }

        $url = $this->baseUrl().$this->nafathAuthPath();
        $body = [
            'nationalIds' => [$nationalId],
            'requestId' => $requestId,
            'accountId' => $accountId,
            'webHookUrl' => $webHookUrl,
        ];

        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'Authorization' => 'Bearer '.$tokenResult['token'],
        ];
        if ((bool) config('services.sadq.include_hash_headers', true)) {
            $headers['thumbPrint'] = $thumbPrint;
            $headers['accountId'] = $accountId;
        }

        $record = SadqNafathRequest::create([
            'request_id' => $requestId,
            'national_id' => $nationalId,
            'contract_type' => $contractType,
            'status' => SadqNafathRequest::STATUS_PENDING,
            'last_payload' => ['initiated_at' => now()->toIso8601String()],
        ]);

        try {
            $response = Http::timeout($this->timeoutSeconds())
                ->connectTimeout(min(15, $this->timeoutSeconds()))
                ->withOptions(['verify' => (bool) config('services.sadq.verify_ssl', true)])
                ->withHeaders($headers)
                ->asJson()
                ->post($url, $body);
        } catch (ConnectionException $e) {
            Log::error('Sadq connection', ['e' => $e->getMessage(), 'request_id' => $requestId]);
            $record->update([
                'status' => SadqNafathRequest::STATUS_ERROR,
                'last_payload' => array_merge($record->last_payload ?? [], ['error' => $e->getMessage()]),
            ]);

            return [
                'success' => false,
                'http_status' => 0,
                'request_id' => $requestId,
                'national_id' => $nationalId,
                'contract_type' => $contractType,
                'sadq_response' => null,
                'message' => 'Connection timeout or unreachable.',
            ];
        } catch (Throwable $e) {
            Log::error('Sadq client', ['e' => $e->getMessage(), 'request_id' => $requestId]);
            $record->update([
                'status' => SadqNafathRequest::STATUS_ERROR,
                'last_payload' => array_merge($record->last_payload ?? [], ['error' => $e->getMessage()]),
            ]);

            return [
                'success' => false,
                'http_status' => 0,
                'request_id' => $requestId,
                'national_id' => $nationalId,
                'contract_type' => $contractType,
                'sadq_response' => null,
                'message' => $e->getMessage(),
            ];
        }

        $status = $response->status();
        $responseBody = $response->json();
        if (! is_array($responseBody)) {
            $responseBody = ['raw' => substr((string) $response->body(), 0, 4000)];
        }

        if ($this->responseIndicatesFailure($responseBody)) {
            $record->update([
                'status' => SadqNafathRequest::STATUS_ERROR,
                'last_payload' => array_merge($record->last_payload ?? [], ['sadq' => $responseBody]),
            ]);

            return [
                'success' => false,
                'http_status' => $status,
                'request_id' => $requestId,
                'national_id' => $nationalId,
                'contract_type' => $contractType,
                'sadq_response' => $responseBody,
                'message' => $this->extractFailureMessage($responseBody),
            ];
        }

        $this->logExchange($url, $body, $headers, $status, (string) $response->body(), $requestId);

        if ($status === 500) {
            $record->update([
                'status' => SadqNafathRequest::STATUS_ERROR,
                'last_payload' => array_merge($record->last_payload ?? [], ['sadq' => $responseBody]),
            ]);

            return [
                'success' => false,
                'http_status' => 500,
                'request_id' => $requestId,
                'national_id' => $nationalId,
                'contract_type' => $contractType,
                'sadq_response' => $responseBody,
                'message' => 'Sadq internal error - likely activation issue',
            ];
        }

        if (! $response->successful()) {
            $record->update([
                'status' => SadqNafathRequest::STATUS_ERROR,
                'last_payload' => array_merge($record->last_payload ?? [], ['sadq' => $responseBody]),
            ]);

            return [
                'success' => false,
                'http_status' => $status,
                'request_id' => $requestId,
                'national_id' => $nationalId,
                'contract_type' => $contractType,
                'sadq_response' => $responseBody,
                'message' => (string) (data_get($responseBody, 'message') ?: 'Sadq HTTP '.$status),
            ];
        }

        $record->update([
            'last_payload' => array_merge($record->last_payload ?? [], ['sadq' => $responseBody]),
        ]);

        return [
            'success' => true,
            'http_status' => $status,
            'request_id' => $requestId,
            'national_id' => $nationalId,
            'contract_type' => $contractType,
            'sadq_response' => $responseBody,
            'message' => null,
        ];
    }

    /**
     * @return array{success:bool, token:?string, http_status:int, message:?string}
     */
    protected function getAccessToken(): array
    {
        if (Cache::has(self::TOKEN_CACHE_KEY)) {
            $cached = (string) Cache::get(self::TOKEN_CACHE_KEY);
            if ($cached !== '') {
                return [
                    'success' => true,
                    'token' => $cached,
                    'http_status' => 200,
                    'message' => null,
                ];
            }
        }

        $username = (string) (config('services.sadq.username') ?? '');
        $password = (string) (config('services.sadq.password') ?? '');
        $accountId = (string) (config('services.sadq.account_id') ?? '');
        $accountSecret = (string) (config('services.sadq.account_secret') ?? '');
        $grantType = (string) (config('services.sadq.grant_type') ?? 'integration');

        $missing = [];
        if ($username === '') {
            $missing[] = 'username';
        }
        if ($password === '') {
            $missing[] = 'password';
        }
        if ($accountId === '') {
            $missing[] = 'accountId';
        }
        if ($accountSecret === '') {
            $missing[] = 'accountSecret';
        }

        if ($missing !== []) {
            return [
                'success' => false,
                'token' => null,
                'http_status' => 503,
                'message' => 'Sadq token config missing: '.implode(', ', $missing).'.',
            ];
        }

        $url = $this->baseUrl().$this->tokenPath();
        try {
            $response = Http::timeout($this->timeoutSeconds())
                ->connectTimeout(min(15, $this->timeoutSeconds()))
                ->withOptions(['verify' => (bool) config('services.sadq.verify_ssl', true)])
                ->withBasicAuth($username, $password)
                ->acceptJson()
                ->asForm()
                ->post($url, [
                    'grant_type' => $grantType,
                    'password' => $password,
                    'username' => $username,
                    'accountId' => $accountId,
                    'accountSecret' => $accountSecret,
                ]);
        } catch (ConnectionException $e) {
            Log::error('Sadq token connection', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'token' => null,
                'http_status' => 0,
                'message' => 'Sadq token endpoint unreachable.',
            ];
        } catch (Throwable $e) {
            Log::error('Sadq token client error', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'token' => null,
                'http_status' => 0,
                'message' => $e->getMessage(),
            ];
        }

        if (! $response->successful()) {
            Log::warning('Sadq token failed', [
                'status' => $response->status(),
                'body' => substr((string) $response->body(), 0, 1000),
            ]);
            return [
                'success' => false,
                'token' => null,
                'http_status' => $response->status(),
                'message' => 'Sadq token request failed (HTTP '.$response->status().').',
            ];
        }

        $json = $response->json() ?? [];
        $token = (string) data_get($json, 'access_token', '');
        if ($token === '') {
            return [
                'success' => false,
                'token' => null,
                'http_status' => 500,
                'message' => 'Sadq token response missing access_token.',
            ];
        }

        $expiresIn = (int) data_get($json, 'expires_in', $this->tokenCacheTtl());
        $ttl = max(60, min($this->tokenCacheTtl(), $expiresIn - 60));
        Cache::put(self::TOKEN_CACHE_KEY, $token, $ttl);

        return [
            'success' => true,
            'token' => $token,
            'http_status' => 200,
            'message' => null,
        ];
    }

    /**
     * @return array{success:bool,http_status:int,message:?string,response:?array}
     */
    protected function ensureWebhookRegistered(string $token, string $webhookUrl): array
    {
        $cacheKey = self::WEBHOOK_CACHE_KEY.':'.md5($webhookUrl);
        if (Cache::has($cacheKey)) {
            return [
                'success' => true,
                'http_status' => 200,
                'message' => null,
                'response' => null,
            ];
        }

        $url = $this->baseUrl().$this->addWebhookPath();
        $body = [
            'webhookUrl' => $webhookUrl,
            'isDefault' => true,
        ];

        try {
            $response = Http::timeout($this->timeoutSeconds())
                ->connectTimeout(min(15, $this->timeoutSeconds()))
                ->withOptions(['verify' => (bool) config('services.sadq.verify_ssl', true)])
                ->withToken($token)
                ->acceptJson()
                ->asJson()
                ->post($url, $body);
        } catch (ConnectionException $e) {
            Log::error('Sadq add-webhook connection error', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'http_status' => 0,
                'message' => 'Sadq webhook endpoint unreachable.',
                'response' => null,
            ];
        } catch (Throwable $e) {
            Log::error('Sadq add-webhook client error', ['message' => $e->getMessage()]);
            return [
                'success' => false,
                'http_status' => 0,
                'message' => $e->getMessage(),
                'response' => null,
            ];
        }

        $json = $response->json();
        if (! is_array($json)) {
            $json = ['raw' => substr((string) $response->body(), 0, 1000)];
        }

        Log::info('Sadq add-webhook response', [
            'status' => $response->status(),
            'errorCode' => data_get($json, 'errorCode'),
            'message' => data_get($json, 'message'),
            'webhookUrl' => $webhookUrl,
        ]);

        if (! $response->successful()) {
            return [
                'success' => false,
                'http_status' => $response->status(),
                'message' => 'Sadq add-webhook failed (HTTP '.$response->status().').',
                'response' => $json,
            ];
        }

        $errorCode = (int) data_get($json, 'errorCode', 0);
        if ($errorCode !== 0) {
            return [
                'success' => false,
                'http_status' => 422,
                'message' => (string) (data_get($json, 'message') ?: 'Sadq add-webhook errorCode='.$errorCode),
                'response' => $json,
            ];
        }

        Cache::put($cacheKey, true, $this->webhookRegisterTtl());

        return [
            'success' => true,
            'http_status' => 200,
            'message' => null,
            'response' => $json,
        ];
    }

    /**
     * @param  array<string, mixed>  $response
     */
    protected function responseIndicatesFailure(array $response): bool
    {
        if (! array_is_list($response)) {
            return false;
        }

        foreach ($response as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $error = strtolower(trim((string) data_get($entry, 'error', '')));
            $status = strtolower(trim((string) data_get($entry, 'status', '')));
            $code = strtolower(trim((string) data_get($entry, 'code', '')));

            if (($error !== '' && $error !== 'success') || $status === 'failed' || $status === 'error' || $code === 'failed') {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $response
     */
    protected function extractFailureMessage(array $response): string
    {
        if (! array_is_list($response)) {
            return 'Sadq returned a failed response.';
        }

        foreach ($response as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $error = trim((string) data_get($entry, 'error', ''));
            $status = trim((string) data_get($entry, 'status', ''));
            $code = trim((string) data_get($entry, 'code', ''));

            if ($error !== '' && strcasecmp($error, 'Success') !== 0) {
                return $error;
            }
            if ($status !== '' && strcasecmp($status, 'Success') !== 0) {
                return 'Sadq status: '.$status;
            }
            if ($code !== '') {
                return 'Sadq code: '.$code;
            }
        }

        return 'Sadq returned a failed response.';
    }

    /**
     * Status from DB (updated by Sadq webhook).
     *
     * @return array{success: bool, status: string, request_id: ?string, message: ?string}
     */
    public function getLocalStatus(string $nationalId, ?string $contractType = null): array
    {
        $nationalId = preg_replace('/\D/', '', $nationalId) ?? '';
        $q = SadqNafathRequest::query()->where('national_id', $nationalId)->orderByDesc('id');
        if ($contractType !== null && $contractType !== '') {
            $q->where('contract_type', $contractType);
        }
        $row = $q->first();
        if (! $row) {
            return [
                'success' => true,
                'status' => 'not_found',
                'request_id' => null,
                'message' => null,
            ];
        }

        return [
            'success' => true,
            'status' => $row->status,
            'request_id' => $row->request_id,
            'message' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $body
     * @param  array<string, string>  $headers
     */
    protected function logExchange(string $url, array $body, array $headers, int $httpStatus, string $rawBody, string $requestId): void
    {
        $tp = $headers['thumbPrint'] ?? '';
        $masked = strlen($tp) > 8 ? substr($tp, 0, 4).'…'.substr($tp, -4) : '***';

        Log::info('Sadq IntegrationNafathAuth', [
            'request_id' => $requestId,
            'url' => $url,
            'request_body' => $body,
            'request_headers' => [
                'thumbPrint' => $masked,
                'accountId' => $headers['accountId'] ?? '',
                'Content-Type' => $headers['Content-Type'] ?? '',
                'Authorization' => isset($headers['Authorization']) ? 'Bearer ***' : null,
            ],
            'response_status' => $httpStatus,
            'response_body' => substr($rawBody, 0, 4000),
        ]);
    }
}
