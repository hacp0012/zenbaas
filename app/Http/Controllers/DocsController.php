<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\Finder\SplFileInfo;

class DocsController extends Controller
{
    /**
     * Legacy document path aliases mapped to their canonical locations inside each SDK.
     *
     * @var array<string, string>
     */
    private const LEGACY_PATH_MAP = [
        'README.md' => 'docs/README.md',
        'sdks/js-ts.md' => 'sdks/js-ts/docs/usage.md',
        'sdks/nodejs-reference.md' => 'sdks/js-ts/docs/reference.md',
        'docs/sdks/js-ts.md' => 'sdks/js-ts/docs/usage.md',
        'docs/sdks/nodejs-reference.md' => 'sdks/js-ts/docs/reference.md',
    ];

    /**
     * Human-readable labels for known SDK directory slugs under `/sdks/<slug>`.
     *
     * @var array<string, string>
     */
    private const SDK_LABELS = [
        'js-ts' => 'Node.js & Web',
        'node-js' => 'Node.js & Web',
        'dart' => 'Dart & Flutter',
        'python' => 'Python',
    ];

    /**
     * Display the Platform & SDK documentation discovered dynamically from `/docs` and `/sdks/*`.
     */
    public function show(Request $request): Response
    {
        $documents = $this->discoverAllDocumentationFiles();

        $requestedDoc = $request->string('doc', 'docs/README.md')->toString();
        $normalizedRequested = ltrim(str_replace(['\\', '..'], ['/', ''], $requestedDoc), '/');
        $resolvedRequested = self::LEGACY_PATH_MAP[$normalizedRequested] ?? $normalizedRequested;

        $currentDocument = collect($documents)->firstWhere('path', $resolvedRequested)
            ?? collect($documents)->firstWhere('path', 'docs/README.md')
            ?? ($documents[0] ?? null);

        $rawMarkdown = '';
        $htmlContent = '';
        $headings = [];

        if ($currentDocument !== null) {
            $fullPath = base_path(str_replace('/', DIRECTORY_SEPARATOR, $currentDocument['path']));

            if (is_file($fullPath)) {
                $rawMarkdown = (string) File::get($fullPath);
                $processedMarkdown = $this->rewriteInternalMarkdownLinks($rawMarkdown, $currentDocument['path']);
                $renderedHtml = Str::markdown($processedMarkdown, [
                    'html_input' => 'strip',
                    'allow_unsafe_links' => false,
                ]);
                $htmlContent = $this->injectHeadingIds($renderedHtml);
                $headings = $this->extractHeadings($rawMarkdown);
            }
        }

        return Inertia::render('docs/show', [
            'documents' => $documents,
            'currentDoc' => $currentDocument,
            'rawMarkdown' => $rawMarkdown,
            'htmlContent' => $htmlContent,
            'headings' => $headings,
        ]);
    }

    /**
     * Discover Markdown documentation files from `/docs` (Platform overview) and `/sdks/<sdk>` (per-SDK docs).
     *
     * @return array<int, array{
     *     path: string,
     *     title: string,
     *     nav_label: string,
     *     category: string,
     *     sdk_slug: string|null,
     *     sdk_label: string|null,
     *     filename: string,
     *     updated_at: string,
     *     parent_path: string|null,
     *     sort_order: int
     * }>
     */
    private function discoverAllDocumentationFiles(): array
    {
        $items = [];

        $docsBasePath = base_path('docs');
        if (! is_dir($docsBasePath)) {
            mkdir($docsBasePath, 0755, true);
        }

        /** @var SplFileInfo $file */
        foreach (File::allFiles($docsBasePath) as $file) {
            if (strtolower($file->getExtension()) !== 'md') {
                continue;
            }

            $subPath = str_replace('\\', '/', $file->getRelativePathname());

            // Ignore deprecated `/docs/sdks/*` files now that SDK docs live inside `/sdks/<sdk>/`
            if (str_starts_with($subPath, 'sdks/')) {
                continue;
            }

            $relativePath = 'docs/'.$subPath;
            $contents = (string) File::get($file->getRealPath());
            $title = $this->extractTitle($contents, $file->getFilenameWithoutExtension());
            $isRootReadme = strtolower($subPath) === 'readme.md';

            $items[] = [
                'path' => $relativePath,
                'title' => $title,
                'nav_label' => $isRootReadme ? 'Présentation' : $title,
                'category' => 'Plateforme',
                'sdk_slug' => null,
                'sdk_label' => null,
                'filename' => $file->getFilename(),
                'updated_at' => date('Y-m-d H:i', $file->getMTime()),
                'parent_path' => null,
                'sort_order' => $isRootReadme ? 1 : 10,
            ];
        }

        $sdksBasePath = base_path('sdks');
        if (is_dir($sdksBasePath)) {
            foreach (File::directories($sdksBasePath) as $sdkDirectory) {
                $sdkSlug = basename($sdkDirectory);
                $sdkLabel = self::SDK_LABELS[$sdkSlug] ?? Str::headline($sdkSlug);
                $sdkRootPath = null;

                foreach (['README.md', 'Readme.md', 'readme.md'] as $readmeCandidate) {
                    $candidateFullPath = $sdkDirectory.DIRECTORY_SEPARATOR.$readmeCandidate;
                    if (is_file($candidateFullPath)) {
                        $sdkRootPath = "sdks/{$sdkSlug}/".basename($candidateFullPath);
                        $contents = (string) File::get($candidateFullPath);
                        $title = $this->extractTitle($contents, $sdkLabel);

                        $items[] = [
                            'path' => $sdkRootPath,
                            'title' => $title,
                            'nav_label' => 'Introduction',
                            'category' => 'SDKs',
                            'sdk_slug' => $sdkSlug,
                            'sdk_label' => $sdkLabel,
                            'filename' => basename($candidateFullPath),
                            'updated_at' => date('Y-m-d H:i', (int) filemtime($candidateFullPath)),
                            'parent_path' => null,
                            'sort_order' => 100,
                        ];

                        break;
                    }
                }

                foreach (['docs', 'doc'] as $docSubfolder) {
                    $sdkDocsDir = $sdkDirectory.DIRECTORY_SEPARATOR.$docSubfolder;
                    if (! is_dir($sdkDocsDir)) {
                        continue;
                    }

                    /** @var SplFileInfo $docFile */
                    foreach (File::allFiles($sdkDocsDir) as $docFile) {
                        if (strtolower($docFile->getExtension()) !== 'md') {
                            continue;
                        }

                        $subRelative = str_replace('\\', '/', $docFile->getRelativePathname());
                        $relativePath = "sdks/{$sdkSlug}/{$docSubfolder}/{$subRelative}";
                        $contents = (string) File::get($docFile->getRealPath());
                        $stem = strtolower($docFile->getFilenameWithoutExtension());
                        $title = $this->extractTitle($contents, $docFile->getFilenameWithoutExtension());

                        [$navLabel, $sortOrder] = match ($stem) {
                            'usage', 'usages', 'guide', 'quickstart' => ['Guide d\'utilisation', 110],
                            'reference', 'references', 'api' => ['Références API', 120],
                            default => [$title, 150],
                        };

                        $items[] = [
                            'path' => $relativePath,
                            'title' => $title,
                            'nav_label' => $navLabel,
                            'category' => 'SDKs',
                            'sdk_slug' => $sdkSlug,
                            'sdk_label' => $sdkLabel,
                            'filename' => $docFile->getFilename(),
                            'updated_at' => date('Y-m-d H:i', $docFile->getMTime()),
                            'parent_path' => $sdkRootPath,
                            'sort_order' => $sortOrder,
                        ];
                    }
                }
            }
        }

        usort($items, function (array $a, array $b): int {
            if ($a['sort_order'] !== $b['sort_order']) {
                return $a['sort_order'] <=> $b['sort_order'];
            }

            return strcmp($a['path'], $b['path']);
        });

        return $items;
    }

    /**
     * Extract the main H1 title (`# ...`) from a Markdown file.
     */
    private function extractTitle(string $markdown, string $fallback): string
    {
        if (preg_match('/^#\s+(.+)$/m', $markdown, $matches)) {
            return trim(str_replace(['`', '**'], '', $matches[1]));
        }

        return Str::headline($fallback);
    }

    /**
     * Extract H2 and H3 headings from Markdown for the table of contents.
     *
     * @return array<int, array{level: int, text: string, id: string}>
     */
    private function extractHeadings(string $markdown): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $markdown) ?: [];
        $headings = [];
        $inCodeBlock = false;

        foreach ($lines as $line) {
            if (str_starts_with(trim($line), '```')) {
                $inCodeBlock = ! $inCodeBlock;

                continue;
            }

            if ($inCodeBlock) {
                continue;
            }

            if (preg_match('/^(#{2,3})\s+(.+)$/', trim($line), $matches)) {
                $level = strlen($matches[1]);
                $cleanText = trim(str_replace(['`', '**'], '', $matches[2]));
                $headings[] = [
                    'level' => $level,
                    'text' => $cleanText,
                    'id' => Str::slug($cleanText),
                ];
            }
        }

        return $headings;
    }

    /**
     * Inject deterministic `id` attributes into rendered `<h2>` and `<h3>` tags so the table of contents can anchor-link to them.
     */
    private function injectHeadingIds(string $html): string
    {
        return (string) preg_replace_callback(
            '/<h([23])>(.*?)<\/h\1>/is',
            function (array $matches): string {
                $level = $matches[1];
                $innerHtml = $matches[2];
                $plainText = html_entity_decode(strip_tags($innerHtml), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $cleanText = trim(str_replace(['`', '**'], '', $plainText));
                $id = Str::slug($cleanText);

                return "<h{$level} id=\"{$id}\">{$innerHtml}</h{$level}>";
            },
            $html
        );
    }

    /**
     * Rewrite relative `.md` links (e.g. `./docs/usage.md`, `../README.md`, or `sdks/js-ts/README.md`) to `/docs?doc=<resolved-path>`.
     */
    private function rewriteInternalMarkdownLinks(string $markdown, string $currentDocPath): string
    {
        $currentDir = str_replace('\\', '/', dirname($currentDocPath));
        if ($currentDir === '.') {
            $currentDir = '';
        }

        return (string) preg_replace_callback(
            '/\[([^\]]+)\]\((?!https?:\/\/)([^)]+\.md)\)/i',
            function (array $matches) use ($currentDir): string {
                $label = $matches[1];
                $rawTarget = trim($matches[2]);

                if (str_starts_with($rawTarget, 'docs/') || str_starts_with($rawTarget, 'sdks/')) {
                    $resolved = $this->normalizeRelativePath($rawTarget);
                } else {
                    $combined = $currentDir !== '' ? "{$currentDir}/{$rawTarget}" : $rawTarget;
                    $resolved = $this->normalizeRelativePath($combined);
                }

                $resolved = self::LEGACY_PATH_MAP[$resolved] ?? $resolved;

                return "[{$label}](/docs?doc=".urlencode($resolved).')';
            },
            $markdown
        );
    }

    /**
     * Normalize a relative path containing `./` or `../` segments.
     */
    private function normalizeRelativePath(string $path): string
    {
        $segments = explode('/', str_replace('\\', '/', $path));
        $normalized = [];

        foreach ($segments as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }
            if ($segment === '..') {
                array_pop($normalized);

                continue;
            }
            $normalized[] = $segment;
        }

        return implode('/', $normalized);
    }
}
