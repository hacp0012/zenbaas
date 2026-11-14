<?php

namespace App\Models;

use Database\Factories\AppCorsFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $app_id
 * @property string $origin
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['app_id', 'origin'])]
class AppCors extends Model
{
    /** @use HasFactory<AppCorsFactory> */
    use HasFactory;

    protected $table = 'app_cors';

    /**
     * Get the application that owns the CORS rule.
     *
     * @return BelongsTo<App, $this>
     */
    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }
}
