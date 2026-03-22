<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * POST /api/portallogistice/admin/users
     * Create a new user (by admin).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|unique:users,email',
            'phone' => 'required|string|max:20|unique:users,phone',
            'national_id' => 'required|string|max:20|unique:users,national_id',
            'password' => 'nullable|string|min:6',
        ]);

        $password = $validated['password'] ?? Str::random(10);
        $name = trim(($validated['first_name'] ?? '') . ' ' . ($validated['last_name'] ?? ''));

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'] ?? null,
            'name' => $name ?: $validated['first_name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'],
            'national_id' => $validated['national_id'],
            'password' => Hash::make($password),
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
            'is_verified' => false,
            'is_first_login' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء المستخدم بنجاح',
            'data' => [
                'user' => $user->toApiArray(),
                'temp_password' => $password, // للتسليم للمدير فقط
            ],
        ], 201);
    }

    /**
     * POST /api/portallogistice/admin/register
     * Create a new admin (from frontend "إنشاء حساب مدير").
     */
    public function registerAdmin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'first_name' => $validated['name'],
            'last_name' => null,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => null,
            'national_id' => null,
            'password' => Hash::make($validated['password']),
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_ACTIVE,
            'is_verified' => true,
            'is_first_login' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إنشاء حساب المدير بنجاح',
            'data' => [
                'admin' => $user->toApiArray(),
            ],
        ], 201);
    }
}
