<?php

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Hash;

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$user = User::updateOrCreate(
    ['national_id' => '11236305067'],
    [
        'name' => 'مستخدم 11236305067',
        'first_name' => 'مستخدم',
        'last_name' => null,
        'phone' => null,
        'email' => 'u11236305067@local.portallogistice',
        'password' => Hash::make('12345678'),
        'role' => 'user',
        'status' => 'active',
        'is_verified' => true,
        'is_first_login' => false,
    ]
);

echo json_encode([
    'success' => true,
    'id' => $user->id,
    'national_id' => $user->national_id,
    'role' => $user->role,
    'status' => $user->status,
], JSON_UNESCAPED_UNICODE).PHP_EOL;
