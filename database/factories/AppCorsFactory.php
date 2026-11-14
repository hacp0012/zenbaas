<?php

namespace Database\Factories;

use App\Models\App;
use App\Models\AppCors;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AppCors>
 */
class AppCorsFactory extends Factory
{
    protected $model = AppCors::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'app_id' => App::factory(),
            'origin' => 'https://'.fake()->domainName(),
        ];
    }
}
