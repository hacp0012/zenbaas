<?php

namespace Database\Factories;

use App\Models\App;
use App\Modules\Functions\Models\AppFunction;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AppFunction>
 */
class AppFunctionFactory extends Factory
{
    protected $model = AppFunction::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'app_id' => App::factory(),
            'name' => Str::slug(fake()->unique()->words(2, true)),
            'description' => fake()->sentence(),
            'code' => <<<'PHP'
return function($event, $context) {
    $name = $event['payload']['name'] ?? 'Utilisateur';

    return [
        'status' => 200,
        'data' => [
            'success' => true,
            'greeting' => "Bonjour, {$name} !",
        ],
    ];
};
PHP,
            'env_variables' => ['APP_ENV' => 'production'],
            'logs' => [],
            'is_active' => true,
        ];
    }
}
