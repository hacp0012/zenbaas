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
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'max_apps')) {
                $table->unsignedInteger('max_apps')->default(1)->after('is_suspended');
            }

            if (! Schema::hasColumn('users', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('max_apps');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $columns = array_filter(
                ['max_apps', 'expires_at'],
                fn (string $col): bool => Schema::hasColumn('users', $col),
            );

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
