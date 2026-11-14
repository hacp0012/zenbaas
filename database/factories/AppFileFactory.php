<?php

namespace Database\Factories;

use App\Models\App;
use App\Models\AppFile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AppFile>
 */
class AppFileFactory extends Factory
{
    protected $model = AppFile::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $filename = fake()->word().'.png';

        return [
            'app_id' => App::factory(),
            'disk' => 'public',
            'folder' => '/',
            'path' => 'tenants/demo/'.$filename,
            'original_name' => $filename,
            'size' => fake()->numberBetween(1024, 1048576),
            'mime_type' => 'image/png',
        ];
    }
}
