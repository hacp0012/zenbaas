@php
    $seoTitle = 'Zenbase — Votre backend complet, prêt en quelques secondes';
    $seoDescription = 'Zenbase est une plateforme Backend-as-a-Service (BaaS) multi-tenant propulsée par Laravel et SQLite JSON1 isolé : API NoSQL instantanées, Authentification JWT & OTP, stockage de fichiers, Web Functions PHP serverless et Serveur MCP natif.';
    $seoUrl = url()->current();
    $seoImage = asset('og-image.png');
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Primary SEO Meta Tags --}}
        <meta name="application-name" content="Zenbase">
        <meta name="description" content="{{ $seoDescription }}">
        <meta name="keywords" content="Zenbase, BaaS, Backend as a Service, Laravel, SQLite JSON1, API NoSQL, Authentification OTP, JWT, Web Functions PHP, Serveur MCP, multi-tenant">
        <meta name="author" content="Zenbase">
        <meta name="robots" content="index, follow">
        <meta name="theme-color" content="#059669" media="(prefers-color-scheme: light)">
        <meta name="theme-color" content="#0e0f11" media="(prefers-color-scheme: dark)">
        <link rel="canonical" href="{{ $seoUrl }}">

        {{-- Open Graph / Link Preview (WhatsApp, LinkedIn, Facebook, Slack, Discord) --}}
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="Zenbase">
        <meta property="og:locale" content="fr_FR">
        <meta property="og:url" content="{{ $seoUrl }}">
        <meta property="og:title" content="{{ $seoTitle }}">
        <meta property="og:description" content="{{ $seoDescription }}">
        <meta property="og:image" content="{{ $seoImage }}">
        <meta property="og:image:type" content="image/png">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta property="og:image:alt" content="Zenbase — Plateforme Backend-as-a-Service Multi-Tenant">

        {{-- Twitter / X Card --}}
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $seoTitle }}">
        <meta name="twitter:description" content="{{ $seoDescription }}">
        <meta name="twitter:image" content="{{ $seoImage }}">
        <meta name="twitter:image:alt" content="Zenbase — Plateforme Backend-as-a-Service Multi-Tenant">

        {{-- Structured Data (JSON-LD) for Search Engines --}}
        <script type="application/ld+json">
            {!! json_encode([
                '@context' => 'https://schema.org',
                '@type' => 'SoftwareApplication',
                'name' => 'Zenbase',
                'applicationCategory' => 'DeveloperApplication',
                'operatingSystem' => 'Web',
                'url' => url('/'),
                'image' => $seoImage,
                'description' => $seoDescription,
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
        </script>

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(0.972 0.003 260);
            }

            html.dark {
                background-color: oklch(0.145 0.004 260);
            }
        </style>

        {{-- Favicons & App Icons --}}
        <link rel="icon" type="image/svg+xml" href="{{ asset('favicon.svg') }}">
        <link rel="icon" type="image/png" sizes="96x96" href="{{ asset('favicon-96x96.png') }}">
        <link rel="shortcut icon" href="{{ asset('favicon.ico') }}">
        <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('apple-touch-icon.png') }}">
        <link rel="manifest" href="{{ asset('site.webmanifest') }}">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Zenbase') === 'Laravel' ? 'Zenbase' : config('app.name', 'Zenbase') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
