<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('app_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('app_id')->constrained('apps')->cascadeOnDelete();
            $table->string('source', 20);
            $table->string('level', 15)->default('info');
            $table->string('action', 160);
            $table->string('method', 12)->nullable();
            $table->string('path', 255)->nullable();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->string('api_key_role', 20)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('message')->nullable();
            $table->json('context')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['app_id', 'created_at']);
            $table->index(['app_id', 'source', 'created_at']);
            $table->index(['app_id', 'level', 'created_at']);
            $table->index(['app_id', 'status_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_logs');
    }
};
