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
        Schema::create('app_cors', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('app_id')->constrained('apps')->cascadeOnDelete();
            $table->string('origin');
            $table->timestamps();

            $table->unique(['app_id', 'origin']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_cors');
    }
};
