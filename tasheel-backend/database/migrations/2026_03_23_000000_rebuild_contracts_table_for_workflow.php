<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('contracts');

        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['sale', 'rental']);
            $table->string('title');
            $table->string('file_path')->nullable();
            $table->enum('status', [
                'draft',
                'sent',
                'nafath_pending',
                'nafath_approved',
                'admin_pending',
                'approved',
                'rejected',
            ])->default('draft');
            $table->uuid('nafath_reference')->nullable()->unique();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
