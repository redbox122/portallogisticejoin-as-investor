<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Services\SadqService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ContractController extends Controller
{
    public function __construct(
        protected SadqService $sadqService
    ) {}

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'national_id' => 'required|string|max:32',
            'contract_text' => 'required|string',
        ]);

        $requestId = (string) Str::uuid();

        $contract = Contract::create([
            'national_id' => $validated['national_id'],
            'contract_text' => $validated['contract_text'],
            'request_id' => $requestId,
            'status' => 'pending',
        ]);

        $result = $this->sadqService->initiateNafath($validated['national_id']);
        $sadqRequestId = (string) ($result['request_id'] ?? '');

        if ($sadqRequestId !== '' && $sadqRequestId !== $requestId) {
            $contract->update(['request_id' => $sadqRequestId]);
            $requestId = $sadqRequestId;
        }

        return response()->json([
            'success' => true,
            'request_id' => $requestId,
            'status' => $contract->status,
            'sadq' => $result,
        ]);
    }

    public function status(string $requestId): JsonResponse
    {
        $contract = Contract::where('request_id', $requestId)->first();

        if (! $contract) {
            return response()->json([
                'success' => false,
                'message' => 'Contract request not found.',
            ], 404);
        }

        return response()->json([
            'request_id' => $contract->request_id,
            'status' => $contract->status,
            'national_id' => $contract->national_id,
        ]);
    }

    public function mockApprove(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'request_id' => 'required|uuid',
        ]);

        $contract = Contract::where('request_id', $validated['request_id'])->first();
        if (! $contract) {
            return response()->json([
                'success' => false,
                'message' => 'Contract request not found.',
            ], 404);
        }

        $contract->update(['status' => 'approved']);

        return response()->json([
            'success' => true,
            'request_id' => $contract->request_id,
            'status' => $contract->status,
        ]);
    }
}
