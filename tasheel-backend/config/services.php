<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    | Sadq Tasheel — Integration Nafath (Hash Sign: thumbPrint + accountId headers only).
    */
    'sadq' => [
        'base_url' => rtrim(env('SADQ_BASE_URL', 'https://sandbox-api.sadq-sa.com'), '/'),
        'account_id' => env('SADQ_ACCOUNT_ID'),
        'account_secret' => env('SADQ_ACCOUNT_SECRET'),
        'username' => env('SADQ_USERNAME'),
        'password' => env('SADQ_PASSWORD'),
        'grant_type' => env('SADQ_GRANT_TYPE', 'integration'),
        'token_path' => env('SADQ_TOKEN_PATH', '/Authentication/Authority/Token'),
        'add_webhook_path' => env('SADQ_ADD_WEBHOOK_PATH', '/IntegrationService/Configuration/webhook'),
        'thumbprint' => env('SADQ_THUMBPRINT'),
        'nafath_auth_path' => env('SADQ_NAFATH_AUTH_PATH', '/Authentication/Authority/IntegrationNafathAuth'),
        'include_hash_headers' => filter_var(env('SADQ_INCLUDE_HASH_HEADERS', true), FILTER_VALIDATE_BOOL),
        'timeout' => (int) env('SADQ_HTTP_TIMEOUT', 30),
        'verify_ssl' => filter_var(env('SADQ_VERIFY_SSL', true), FILTER_VALIDATE_BOOL),
        'token_cache_ttl' => (int) env('SADQ_TOKEN_CACHE_TTL', 1800),
        'webhook_register_ttl' => (int) env('SADQ_WEBHOOK_REGISTER_TTL', 86400),
    ],

];
