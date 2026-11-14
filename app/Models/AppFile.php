<?php

namespace App\Models;

use Database\Factories\AppFileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $app_id
 * @property string $disk
 * @property string $folder
 * @property string $path
 * @property string $original_name
 * @property int $size
 * @property string $mime_type
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read string $url
 */
#[Fillable(['app_id', 'disk', 'folder', 'path', 'original_name', 'size', 'mime_type'])]
class AppFile extends Model
{
    /** @use HasFactory<AppFileFactory> */
    use HasFactory, HasUuids;

    protected $table = 'app_files';

    protected $appends = ['url'];

    /**
     * Get the application that owns the file.
     *
     * @return BelongsTo<App, $this>
     */
    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }

    /**
     * Get the public URL for the stored file.
     */
    public function getUrlAttribute(): string
    {
        return url('/storage/files/'.$this->id.'/'.rawurlencode($this->original_name ?: basename($this->path)));
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }
}
