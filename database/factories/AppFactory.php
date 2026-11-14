<?php

namespace Database\Factories;

use App\Models\App;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<App>
 */
class AppFactory extends Factory
{
    protected $model = App::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->words(2, true),
            'description' => fake()->sentence(),
            'public_key' => App::generatePublicKey(),
            'secret_key' => App::generateSecretKey(),
            'database_config' => null,
            'settings' => ['rate_limit' => 120],
            'api_calls_count' => 0,
        ];
    }
}
