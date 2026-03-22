<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NafathController;
use App\Http\Controllers\SadqTestController;
use App\Http\Controllers\SadqWebhookController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\Admin\UserController as AdminUserController;

/*
|--------------------------------------------------------------------------
| Step 2 – Learning routes: first JSON responses (GET, no database)
|--------------------------------------------------------------------------
*/
Route::get('/hello', function () {
    return response()->json([
        'message' => 'Hello API',
        'time' => now()->toDateTimeString(),
    ]);
});

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::post('webhook/sadq', [SadqWebhookController::class, 'handle']);
Route::post('test/nafath', [SadqTestController::class, 'nafath']);
Route::post('contracts/send', [ContractController::class, 'send']);
Route::get('contracts/status/{request_id}', [ContractController::class, 'status']);
Route::post('contracts/mock-approve', [ContractController::class, 'mockApprove']);

/*
|--------------------------------------------------------------------------
| API Routes - Portallogistice (compatible with React frontend)
|--------------------------------------------------------------------------
*/

Route::prefix('portallogistice')->group(function () {

    // ---- Public auth ----
    Route::post('login', [AuthController::class, 'login']);
    Route::post('send-otp', [AuthController::class, 'sendOtp']);
    Route::post('verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);

    // Admin login + public register (أول مرة - إنشاء حساب مدير بدون تسجيل دخول)
    Route::post('admin/login', [AuthController::class, 'adminLogin']);
    Route::post('admin/register', [AdminUserController::class, 'registerAdmin']);

    // ---- Protected (user) - dashboard + logout ----
    Route::get('dashboard', [DashboardController::class, 'index'])->middleware('auth.token');
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth.token');

    // Sadq Nafath (Bearer token required — same as ContractForm.js)
    Route::post('nafath/initiate', [NafathController::class, 'initiate'])->middleware('auth.token');
    Route::get('nafath/checkStatus', [NafathController::class, 'checkStatus'])->middleware('auth.token');

    // ---- Protected (admin only) ----
    Route::prefix('admin')->middleware(['auth.token', 'admin'])->group(function () {
        Route::post('logout', [AuthController::class, 'adminLogout']);
        Route::post('users', [AdminUserController::class, 'store']);
    });
});
