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
     * GET /api/admin/users
     * List users (admin only) with pagination and search.
     */
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $perPage = max(1, min(100, (int) $request->query('per_page', 15)));

        $query = User::query()
            ->where('role', User::ROLE_USER)
            ->orderByDesc('id');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('national_id', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $users->through(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'national_id' => $user->national_id,
                    'phone' => $user->phone,
                    'email' => $user->email,
                    'status' => $user->status,
                    'role' => $user->role,
                    'created_at' => optional($user->created_at)->toIso8601String(),
                ];
            }),
        ]);
    }

    /**
     * POST /api/portallogistice/admin/users
     * Create a new user (by admin).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(
            [
                'name' => 'required|string|max:255',
                'national_id' => 'required|string|max:20|unique:users,national_id',
                'phone' => 'nullable|string|max:20|unique:users,phone',
                'email' => 'nullable|email|unique:users,email',
            ],
            [
                'national_id.unique' => 'رقم الهوية مستخدم مسبقًا',
            ]
        );

        $password = Str::random(12);
        $name = trim((string) $validated['name']);

        $user = User::create([
            'first_name' => $name,
            'last_name' => null,
            'name' => $name,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
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
                'generated_password' => $password,
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
