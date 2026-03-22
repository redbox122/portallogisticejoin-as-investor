<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\SadqNafathRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SadqWebhookController extends Controller
{
    /**
     * Sadq callback: persist requestId + status (approved / rejected / pending).
     */
    public function handle(Request $request): JsonResponse
    {
        $payload = $request->all();

        $requestId = $this->extractRequestId($payload);
        $status = $this->normalizeStatus($payload);

        if ($requestId === null || $requestId === '') {
            Log::warning('Sadq webhook: missing requestId', ['keys' => array_keys($payload)]);

            return response()->json(['success' => true]);
        }

        $record = SadqNafathRequest::where('request_id', $requestId)->first();

        if ($record) {
            $record->update([
                'status' => $status,
                'last_payload' => array_merge($record->last_payload ?? [], [
                    'webhook' => $payload,
                    'webhook_received_at' => now()->toIso8601String(),
                ]),
            ]);
        } else {
            SadqNafathRequest::create([
                'request_id' => $requestId,
                'national_id' => $this->extractNationalId($payload) ?? 'unknown',
                'contract_type' => null,
                'status' => $status,
                'last_payload' => [
                    'webhook' => $payload,
                    'webhook_received_at' => now()->toIso8601String(),
                    'orphan' => true,
                ],
            ]);
        }

        $contract = Contract::where('request_id', $requestId)->first();
        if ($contract) {
            if ($status === SadqNafathRequest::STATUS_APPROVED) {
                $contract->update(['status' => 'approved']);
            } elseif ($status === SadqNafathRequest::STATUS_REJECTED) {
                $contract->update(['status' => 'rejected']);
            } else {
                $contract->update(['status' => 'pending']);
            }
        }

        Log::info('Sadq webhook OK', ['request_id' => $requestId, 'status' => $status]);

        return response()->json(['success' => true]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function extractRequestId(array $payload): ?string
    {
        foreach ([
            data_get($payload, 'requestId'),
            data_get($payload, 'request_id'),
            data_get($payload, 'RequestId'),
            data_get($payload, 'data.requestId'),
            data_get($payload, 'data.request_id'),
        ] as $v) {
            if (is_string($v) && $v !== '') {
                return $v;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function extractNationalId(array $payload): ?string
    {
        $v = data_get($payload, 'nationalId')
            ?? data_get($payload, 'national_id')
            ?? data_get($payload, 'nationalIds.0');

        if (is_string($v) && $v !== '') {
            return preg_replace('/\D/', '', $v) ?: null;
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function normalizeStatus(array $payload): string
    {
        $numericStatus = data_get($payload, 'Status', data_get($payload, 'status'));
        if ($numericStatus !== null && is_numeric($numericStatus)) {
            $n = (int) $numericStatus;
            if ($n === 0) {
                return SadqNafathRequest::STATUS_APPROVED;
            }
            if ($n === 1) {
                return SadqNafathRequest::STATUS_REJECTED;
            }
        }

        $raw = strtolower(trim((string) (
            data_get($payload, 'status')
            ?? data_get($payload, 'Status')
            ?? data_get($payload, 'state')
            ?? data_get($payload, 'nafathStatus')
            ?? data_get($payload, 'data.status')
            ?? ''
        )));

        if ($raw === '') {
            return SadqNafathRequest::STATUS_PENDING;
        }

        if (str_contains($raw, 'approv') || in_array($raw, ['success', 'completed', 'complete'], true)) {
            return SadqNafathRequest::STATUS_APPROVED;
        }

        if (str_contains($raw, 'reject') || str_contains($raw, 'denied') || str_contains($raw, 'fail')) {
            return SadqNafathRequest::STATUS_REJECTED;
        }

        return SadqNafathRequest::STATUS_PENDING;
    }
}
