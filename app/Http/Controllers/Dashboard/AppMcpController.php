<?php

namespace App\Http\Controllers\Dashboard;

use App\Concerns\AuthorizesAppOwnership;
use App\Http\Controllers\Controller;
use App\Models\App;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AppMcpController extends Controller
{
    use AuthorizesAppOwnership;

    /**
     * Metadata catalog of distributable client Agent Skills stored in `resources/skills/`.
     *
     * @var array<string, array{title: string, description: string}>
     */
    private const SKILL_CATALOG = [
        'zenbase-sdk-integration' => [
            'title' => 'Intégration @zenbase/sdk',
            'description' => 'Bonnes pratiques JS/TS/Node/Web : séparation zb_pub_/zb_sec_, typage depuis les schémas MCP, CRUD JSON1, Auth, Storage et ZenbaseBlob.',
        ],
        'zenbase-web-functions' => [
            'title' => 'Web Functions PHP Serverless',
            'description' => 'Règles de syntaxe strictes, référence $event/$context, restrictions du sandbox PHP, limite 5 s et déploiement/test via MCP.',
        ],
        'zenbase-mcp-workflow' => [
            'title' => 'Workflow opérationnel MCP',
            'description' => 'Découverte préalable, respect des permissions granulaires, confirmation avant actions destructrices et hygiène des secrets.',
        ],
    ];

    /**
     * Return the list of distributable client Agent Skills with their Markdown contents.
     *
     * @return array<int, array{slug: string, title: string, description: string, target_path: string, content: string}>
     */
    public static function skillCatalog(): array
    {
        $skills = [];

        foreach (self::SKILL_CATALOG as $slug => $meta) {
            $path = resource_path("skills/{$slug}/SKILL.md");

            if (! is_file($path)) {
                continue;
            }

            $skills[] = [
                'slug' => $slug,
                'title' => $meta['title'],
                'description' => $meta['description'],
                'target_path' => ".agents/skills/{$slug}/SKILL.md",
                'content' => (string) file_get_contents($path),
            ];
        }

        return $skills;
    }

    /**
     * Update the MCP server configuration and permissions for the application.
     */
    public function update(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'read_only' => ['required', 'boolean'],
            'allow_functions' => ['required', 'boolean'],
            'allow_auth_management' => ['required', 'boolean'],
            'allow_storage_write' => ['required', 'boolean'],
        ]);

        $readOnly = (bool) $validated['read_only'];

        $settings = is_array($app->settings) ? $app->settings : [];
        $settings['mcp'] = [
            'enabled' => (bool) $validated['enabled'],
            'read_only' => $readOnly,
            'allow_functions' => ! $readOnly && (bool) $validated['allow_functions'],
            'allow_auth_management' => ! $readOnly && (bool) $validated['allow_auth_management'],
            'allow_storage_write' => ! $readOnly && (bool) $validated['allow_storage_write'],
        ];

        $app->update(['settings' => $settings]);

        $statusLabel = $settings['mcp']['enabled']
            ? ($readOnly ? 'activé (lecture seule)' : 'activé (lecture & écriture)')
            : 'désactivé';

        return back()->with('success', "Configuration MCP enregistrée — serveur {$statusLabel}.");
    }

    /**
     * Download a single distributable client Agent Skill (`SKILL.md`).
     */
    public function downloadSkill(string $skill): SymfonyResponse
    {
        if (! array_key_exists($skill, self::SKILL_CATALOG)) {
            abort(404);
        }

        $path = resource_path("skills/{$skill}/SKILL.md");

        if (! is_file($path)) {
            abort(404);
        }

        return response()->download($path, "{$skill}-SKILL.md", [
            'Content-Type' => 'text/markdown; charset=UTF-8',
        ]);
    }

    /**
     * Download a ZIP bundle containing all distributable client Agent Skills ready to extract into a project.
     */
    public function downloadSkillsBundle(): SymfonyResponse
    {
        $entries = [];

        foreach (array_keys(self::SKILL_CATALOG) as $slug) {
            $path = resource_path("skills/{$slug}/SKILL.md");

            if (is_file($path)) {
                $entries["{$slug}/SKILL.md"] = (string) file_get_contents($path);
            }
        }

        $zipBinary = $this->buildZipArchive($entries);

        return response($zipBinary, 200, [
            'Content-Type' => 'application/zip',
            'Content-Disposition' => 'attachment; filename="zenbase-skills.zip"',
            'Content-Length' => (string) strlen($zipBinary),
        ]);
    }

    /**
     * Build a standard PKZIP (Store method) archive in pure PHP so downloads work without requiring `ext-zip`.
     *
     * @param  array<string, string>  $entries
     */
    private function buildZipArchive(array $entries): string
    {
        $localData = '';
        $centralDirectory = '';
        $offset = 0;
        $count = 0;

        foreach ($entries as $filename => $content) {
            $normalizedName = str_replace('\\', '/', $filename);
            $nameLength = strlen($normalizedName);
            $size = strlen($content);
            $crc = crc32($content);

            $localHeader = pack(
                'VvvvvvVVVvv',
                0x04034B50,
                20,
                0x0800,
                0,
                0,
                0x5821,
                $crc,
                $size,
                $size,
                $nameLength,
                0,
            );

            $localData .= $localHeader.$normalizedName.$content;

            $centralHeader = pack(
                'VvvvvvvVVVvvvvvVV',
                0x02014B50,
                20,
                20,
                0x0800,
                0,
                0,
                0x5821,
                $crc,
                $size,
                $size,
                $nameLength,
                0,
                0,
                0,
                0,
                0,
                $offset,
            );

            $centralDirectory .= $centralHeader.$normalizedName;
            $offset = strlen($localData);
            $count++;
        }

        $endOfCentralDirectory = pack(
            'VvvvvVVv',
            0x06054B50,
            0,
            0,
            $count,
            $count,
            strlen($centralDirectory),
            strlen($localData),
            0,
        );

        return $localData.$centralDirectory.$endOfCentralDirectory;
    }
}
