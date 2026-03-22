<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class AuthByToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $authHeader = (string) $request->header('Authorization', '');
        Log::info('AuthByToken incoming header', [
            'path' => $request->path(),
            'authorization_header_present' => $authHeader !== '',
            'authorization_header_prefix' => $authHeader !== '' ? substr($authHeader, 0, 12) : null,
        ]);

        $token = $request->bearerToken();
        if (!$token) {
            Log::warning('AuthByToken missing bearer token', ['path' => $request->path()]);
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        Log::info('AuthByToken extracted token', [
            'path' => $request->path(),
            'token_prefix' => substr($token, 0, 10),
            'token_length' => strlen($token),
        ]);

        $user = User::where('api_token', $token)->first();
        if (!$user) {
            Log::warning('AuthByToken invalid token', [
                'path' => $request->path(),
                'token_prefix' => substr($token, 0, 10),
            ]);
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        Log::info('AuthByToken authenticated user', [
            'path' => $request->path(),
            'user_id' => $user->id,
            'role' => $user->role,
            'national_id' => $user->national_id,
        ]);

        $request->setUserResolver(fn () => $user);
        return $next($request);
    }
}
