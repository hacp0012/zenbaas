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
        Schema::create('app_functions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('app_id')->constrained('apps')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->longText('code');
            $table->json('env_variables')->nullable();
            $table->json('logs')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['app_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_functions');
    }
};
