<?php

namespace App\Modules\Functions\Models;

use App\Models\App;
use Database\Factories\AppFunctionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $app_id
 * @property string $name
 * @property string|null $description
 * @property string $code
 * @property array<string, string>|null $env_variables
 * @property array<int, array<string, mixed>>|null $logs
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['app_id', 'name', 'description', 'code', 'env_variables', 'logs', 'is_active'])]
class AppFunction extends Model
{
    /** @use HasFactory<AppFunctionFactory> */
    use HasFactory, HasUuids;

    protected $table = 'app_functions';

    /**
     * Create a new factory instance for the model.
     */
    protected static function newFactory(): AppFunctionFactory
    {
        return AppFunctionFactory::new();
    }

    /**
     * Get the application that owns the serverless function.
     *
     * @return BelongsTo<App, $this>
     */
    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'env_variables' => 'array',
            'logs' => 'array',
            'is_active' => 'boolean',
        ];
    }
}
