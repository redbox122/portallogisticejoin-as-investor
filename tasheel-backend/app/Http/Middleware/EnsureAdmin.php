<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user instanceof User) {
            Log::warning('EnsureAdmin rejected request: missing user', [
                'path' => $request->path(),
            ]);
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        if ($user->role !== User::ROLE_ADMIN) {
            Log::warning('EnsureAdmin rejected request: non-admin role', [
                'path' => $request->path(),
                'user_id' => $user->id,
                'role' => $user->role,
            ]);
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        Log::info('EnsureAdmin allowed request', [
            'path' => $request->path(),
            'user_id' => $user->id,
            'role' => $user->role,
        ]);

        return $next($request);
    }
}
