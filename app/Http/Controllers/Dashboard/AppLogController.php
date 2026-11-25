<?php

namespace App\Http\Controllers\Dashboard;

use App\Concerns\AuthorizesAppOwnership;
use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\AppLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AppLogController extends Controller
{
    use AuthorizesAppOwnership;

    /**
     * Export the application's filtered logs as a downloadable JSON file.
     */
    public function export(Request $request, App $app): StreamedResponse
    {
        $this->ensureAppOwnership($request, $app);

        $source = trim((string) $request->query('source', 'all'));
        $level = trim((string) $request->query('level', 'all'));

        $query = $app->logs()->orderByDesc('id')->limit(1000);

        if (in_array($source, AppLog::SOURCES, true)) {
            $query->where('source', $source);
        }

        if (in_array($level, AppLog::LEVELS, true)) {
            $query->where('level', $level);
        }

        $logs = $query->get()->map(fn (AppLog $log): array => [
            'id' => $log->id,
            'created_at' => $log->created_at?->toIso8601String(),
            'source' => $log->source,
            'level' => $log->level,
            'action' => $log->action,
            'method' => $log->method,
            'path' => $log->path,
            'status_code' => $log->status_code,
            'duration_ms' => $log->duration_ms,
            'api_key_role' => $log->api_key_role,
            'ip_address' => $log->ip_address,
            'message' => $log->message,
            'context' => $log->context,
        ])->values()->all();

        $slug = Str::slug($app->name) ?: 'app';
        $filename = "zenbase-logs-{$slug}-".now()->format('Ymd-His').'.json';

        return response()->streamDownload(function () use ($app, $logs): void {
            echo json_encode([
                'app_id' => $app->id,
                'app_name' => $app->name,
                'exported_at' => now()->toIso8601String(),
                'count' => count($logs),
                'logs' => $logs,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }, $filename, [
            'Content-Type' => 'application/json; charset=UTF-8',
        ]);
    }

    /**
     * Clear all or source-filtered logs for this application.
     */
    public function clear(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $source = trim((string) $request->input('source', 'all'));
        $query = $app->logs();

        if (in_array($source, AppLog::SOURCES, true)) {
            $query->where('source', $source);
            $deleted = $query->delete();

            return back()->with('success', "{$deleted} entrée(s) de logs [{$source}] supprimée(s).");
        }

        $deleted = $query->delete();

        return back()->with('success', "{$deleted} entrée(s) de logs supprimée(s) pour cette application.");
    }
}
