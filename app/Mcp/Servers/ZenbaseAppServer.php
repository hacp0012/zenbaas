<?php

namespace App\Mcp\Servers;

use App\Mcp\Prompts\AuditAppSecurityPrompt;
use App\Mcp\Prompts\BuildWebFunctionPrompt;
use App\Mcp\Prompts\BuildWebhookFunctionPrompt;
use App\Mcp\Prompts\DebugWebFunctionPrompt;
use App\Mcp\Prompts\DesignCollectionSchemaPrompt;
use App\Mcp\Prompts\GenerateSdkTypesPrompt;
use App\Mcp\Prompts\ScaffoldCrudModulePrompt;
use App\Mcp\Prompts\SetupAuthFlowPrompt;
use App\Mcp\Resources\AppOverviewResource;
use App\Mcp\Resources\AppSecurityResource;
use App\Mcp\Resources\CollectionSchemaResource;
use App\Mcp\Resources\FunctionCodeResource;
use App\Mcp\Resources\FunctionStubsResource;
use App\Mcp\Resources\SdkDocsResource;
use App\Mcp\Resources\SdkReferenceResource;
use App\Mcp\Resources\WebFunctionsDocsResource;
use App\Mcp\Tools\App\GetAppInfoTool;
use App\Mcp\Tools\Auth\ListTenantUsersTool;
use App\Mcp\Tools\Auth\ManageTenantUserTool;
use App\Mcp\Tools\Database\CreateCollectionTool;
use App\Mcp\Tools\Database\CreateRecordTool;
use App\Mcp\Tools\Database\DeleteCollectionTool;
use App\Mcp\Tools\Database\DeleteRecordTool;
use App\Mcp\Tools\Database\GetCollectionSchemaTool;
use App\Mcp\Tools\Database\GetRecordTool;
use App\Mcp\Tools\Database\ListCollectionsTool;
use App\Mcp\Tools\Database\QueryRecordsTool;
use App\Mcp\Tools\Database\UpdateCollectionSchemaTool;
use App\Mcp\Tools\Database\UpdateRecordTool;
use App\Mcp\Tools\Functions\GetFunctionCodeTool;
use App\Mcp\Tools\Functions\InvokeFunctionTool;
use App\Mcp\Tools\Functions\ListFunctionsTool;
use App\Mcp\Tools\Functions\UpsertFunctionTool;
use App\Mcp\Tools\Storage\DeleteStorageFileTool;
use App\Mcp\Tools\Storage\ListStorageFilesTool;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Instructions;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

#[Name('zenbase-app')]
#[Version('1.0.0')]
#[Instructions(<<<'MARKDOWN'
Serveur MCP officiel d'une application Zenbase (BaaS multi-tenant Laravel + SQLite JSON1).
Utilise `get_app_info` ou les ressources `zenbase://app/overview` et `zenbase://app/security` pour inspecter l'application courante, ses collections, ses fonctions serverless et ses permissions MCP actives.
Avant d'écrire ou déboguer une Web Function PHP, lis `zenbase://docs/function-stubs` et `zenbase://docs/web-functions` (ou `zenbase://functions/{function}/code`).
Pour intégrer le SDK JavaScript/TypeScript côté client, consulte `zenbase://docs/sdk-js` et `zenbase://docs/sdk-reference`.
MARKDOWN)]
class ZenbaseAppServer extends Server
{
    public int $maxPaginationLength = 50;

    public int $defaultPaginationLength = 50;

    protected array $tools = [
        GetAppInfoTool::class,
        ListCollectionsTool::class,
        GetCollectionSchemaTool::class,
        QueryRecordsTool::class,
        GetRecordTool::class,
        CreateCollectionTool::class,
        UpdateCollectionSchemaTool::class,
        DeleteCollectionTool::class,
        CreateRecordTool::class,
        UpdateRecordTool::class,
        DeleteRecordTool::class,
        ListTenantUsersTool::class,
        ManageTenantUserTool::class,
        ListStorageFilesTool::class,
        DeleteStorageFileTool::class,
        ListFunctionsTool::class,
        GetFunctionCodeTool::class,
        UpsertFunctionTool::class,
        InvokeFunctionTool::class,
    ];

    protected array $resources = [
        AppOverviewResource::class,
        AppSecurityResource::class,
        CollectionSchemaResource::class,
        FunctionCodeResource::class,
        FunctionStubsResource::class,
        WebFunctionsDocsResource::class,
        SdkDocsResource::class,
        SdkReferenceResource::class,
    ];

    protected array $prompts = [
        GenerateSdkTypesPrompt::class,
        BuildWebFunctionPrompt::class,
        DebugWebFunctionPrompt::class,
        DesignCollectionSchemaPrompt::class,
        ScaffoldCrudModulePrompt::class,
        SetupAuthFlowPrompt::class,
        BuildWebhookFunctionPrompt::class,
        AuditAppSecurityPrompt::class,
    ];

    /**
     * Return static catalog metadata for the Dashboard MCP UI.
     *
     * @param  array{
     *     enabled: bool,
     *     read_only: bool,
     *     allow_functions: bool,
     *     allow_auth_management: bool,
     *     allow_storage_write: bool
     * }  $settings
     * @return array<int, array{name: string, module: string, access: string, active: bool, description: string}>
     */
    public static function toolCatalog(array $settings): array
    {
        $canWriteDb = $settings['enabled'] && ! $settings['read_only'];
        $canManageAuth = $canWriteDb && $settings['allow_auth_management'];
        $canWriteStorage = $canWriteDb && $settings['allow_storage_write'];
        $canManageFunctions = $canWriteDb && $settings['allow_functions'];

        return [
            ['name' => 'get_app_info', 'module' => 'App', 'access' => 'read', 'active' => $settings['enabled'], 'description' => 'Métadonnées, compteurs, CORS, clés env et permissions MCP.'],
            ['name' => 'list_collections', 'module' => 'Database', 'access' => 'read', 'active' => $settings['enabled'], 'description' => 'Lister les collections NoSQL et leurs schémas.'],
            ['name' => 'get_collection_schema', 'module' => 'Database', 'access' => 'read', 'active' => $settings['enabled'], 'description' => 'Inspecter le schéma de validation d\'une collection.'],
            ['name' => 'query_records', 'module' => 'Database', 'access' => 'read', 'active' => $settings['enabled'], 'description' => 'Requêter, filtrer (SQLite JSON1), paginer ou compter des documents.'],
            ['name' => 'get_record', 'module' => 'Database', 'access' => 'read', 'active' => $settings['enabled'], 'description' => 'Lire un document JSON par son ID.'],
            ['name' => 'create_collection', 'module' => 'Database', 'access' => 'write', 'active' => $canWriteDb, 'description' => 'Créer une collection avec schéma optionnel.'],
            ['name' => 'update_collection_schema', 'module' => 'Database', 'access' => 'write', 'active' => $canWriteDb, 'description' => 'Définir, modifier ou retirer le schéma d\'une collection.'],
            ['name' => 'delete_collection', 'module' => 'Database', 'access' => 'destructive', 'active' => $canWriteDb, 'description' => 'Supprimer définitivement une collection et ses documents.'],
            ['name' => 'create_record', 'module' => 'Database', 'access' => 'write', 'active' => $canWriteDb, 'description' => 'Insérer un nouveau document JSON.'],
            ['name' => 'update_record', 'module' => 'Database', 'access' => 'write', 'active' => $canWriteDb, 'description' => 'Mettre à jour ou remplacer un document existant.'],
            ['name' => 'delete_record', 'module' => 'Database', 'access' => 'destructive', 'active' => $canWriteDb, 'description' => 'Supprimer un document JSON par ID.'],
            ['name' => 'list_tenant_users', 'module' => 'Auth', 'access' => 'read', 'active' => $settings['enabled'], 'description' => 'Lister les utilisateurs finaux de l\'application (sans secrets).'],
            ['name' => 'manage_tenant_user', 'module' => 'Auth', 'access' => 'destructive', 'active' => $canManageAuth, 'description' => 'Bloquer, débloquer ou supprimer un utilisateur tenant.'],
            ['name' => 'list_storage_files', 'module' => 'Storage', 'access' => 'read', 'active' => $settings['enabled'], 'description' => 'Lister les fichiers stockés et consulter le quota.'],
            ['name' => 'delete_storage_file', 'module' => 'Storage', 'access' => 'destructive', 'active' => $canWriteStorage, 'description' => 'Supprimer un fichier du stockage isolé.'],
            ['name' => 'list_functions', 'module' => 'Functions', 'access' => 'read', 'active' => $settings['enabled'], 'description' => 'Lister les Web Functions PHP et leurs derniers logs.'],
            ['name' => 'get_function_code', 'module' => 'Functions', 'access' => 'read', 'active' => $settings['enabled'], 'description' => 'Lire le code source PHP et l\'historique d\'une fonction.'],
            ['name' => 'upsert_function', 'module' => 'Functions', 'access' => 'destructive', 'active' => $canManageFunctions, 'description' => 'Créer ou mettre à jour une Web Function PHP (validée sandbox).'],
            ['name' => 'invoke_function', 'module' => 'Functions', 'access' => 'destructive', 'active' => $canManageFunctions, 'description' => 'Exécuter une Web Function PHP avec un payload JSON.'],
        ];
    }

    /**
     * Return catalog metadata of MCP Resources for the Dashboard UI.
     *
     * @return array<int, array{
     *     uri: string,
     *     mime_type: string,
     *     is_template: bool,
     *     description: string,
     *     usage_example: string
     * }>
     */
    public static function resourceCatalog(): array
    {
        return [
            [
                'uri' => 'zenbase://app/overview',
                'mime_type' => 'application/json',
                'is_template' => false,
                'description' => 'Résumé JSON complet de l’application (collections, functions, CORS, noms de clés .env, quotas, permissions MCP).',
                'usage_example' => '« Lis zenbase://app/overview et résume l’architecture backend actuelle. »',
            ],
            [
                'uri' => 'zenbase://app/security',
                'mime_type' => 'application/json',
                'is_template' => false,
                'description' => 'Posture de sécurité consolidée : origines CORS (wildcard), collections sans schéma, fonctions actives, utilisateurs bloqués et permissions MCP.',
                'usage_example' => '« Lis zenbase://app/security et signale les risques prioritaires avant la mise en production. »',
            ],
            [
                'uri' => 'zenbase://collections/{collection}/schema',
                'mime_type' => 'application/json',
                'is_template' => true,
                'description' => 'Schéma de validation JSON et types autorisés d’une collection précise (remplacez {collection} par son nom réel).',
                'usage_example' => '« Lis zenbase://collections/orders/schema puis génère un formulaire React validé par Zod. »',
            ],
            [
                'uri' => 'zenbase://functions/{function}/code',
                'mime_type' => 'text/x-php',
                'is_template' => true,
                'description' => 'Code source PHP complet d’une Web Function déployée (remplacez {function} par son slug).',
                'usage_example' => '« Attache zenbase://functions/create-order/code et explique sa logique de validation. »',
            ],
            [
                'uri' => 'zenbase://docs/function-stubs',
                'mime_type' => 'text/x-php',
                'is_template' => false,
                'description' => 'Stubs PHP officiels (zenbase-stubs.php) documentant les signatures exactes de $event et $context.',
                'usage_example' => '« Lis zenbase://docs/function-stubs avant d’écrire la Web Function sync-invoices. »',
            ],
            [
                'uri' => 'zenbase://docs/web-functions',
                'mime_type' => 'text/markdown',
                'is_template' => false,
                'description' => 'Guide complet des Web Functions PHP : règles du sandbox, en-têtes HTTP, réponses personnalisées, timeout 5 s et exemples.',
                'usage_example' => '« Consulte zenbase://docs/web-functions pour vérifier quelles fonctions PHP sont autorisées dans le sandbox. »',
            ],
            [
                'uri' => 'zenbase://docs/sdk-js',
                'mime_type' => 'text/markdown',
                'is_template' => false,
                'description' => 'Guide de démarrage rapide du client @hacp0012/zenbase-sdk (Node.js, TypeScript, React, Next.js, Vue).',
                'usage_example' => '« Lis zenbase://docs/sdk-js et initialise le client Zenbase dans mon app Vite. »',
            ],
            [
                'uri' => 'zenbase://docs/sdk-reference',
                'mime_type' => 'text/markdown',
                'is_template' => false,
                'description' => 'Référence API exhaustive de @hacp0012/zenbase-sdk : toutes les méthodes Database, ZenbaseBlob, Auth, Storage, Functions et types TypeScript.',
                'usage_example' => '« Consulte zenbase://docs/sdk-reference pour implémenter une pagination et un upload binaire. »',
            ],
        ];
    }

    /**
     * Return catalog metadata of MCP guided Prompts for the Dashboard UI.
     *
     * @return array<int, array{
     *     name: string,
     *     description: string,
     *     use_case: string,
     *     arguments: array<int, array{name: string, required: bool, description: string}>
     * }>
     */
    public static function promptCatalog(): array
    {
        return [
            [
                'name' => 'generate-sdk-types',
                'description' => 'Génère des interfaces TypeScript strictes et un client @hacp0012/zenbase-sdk typé à partir des collections et schémas réels de l’application.',
                'use_case' => 'Idéal au démarrage d’un frontend ou après modification d’un schéma pour synchroniser automatiquement tous vos types TS.',
                'arguments' => [
                    ['name' => 'target_file', 'required' => false, 'description' => 'Chemin du fichier TS cible (défaut : src/lib/zenbase-types.ts).'],
                ],
            ],
            [
                'name' => 'build-web-function',
                'description' => 'Guide l’agent pour écrire une Web Function PHP conforme au sandbox en injectant vos collections et noms de clés .env.',
                'use_case' => 'Créer un endpoint métier serverless (calcul serveur, export vers Storage, agrégation NoSQL protégée par auth).',
                'arguments' => [
                    ['name' => 'function_name', 'required' => true, 'description' => 'Slug de la fonction (ex. daily-summary).'],
                    ['name' => 'goal', 'required' => true, 'description' => 'Comportement métier attendu.'],
                ],
            ],
            [
                'name' => 'debug-web-function',
                'description' => 'Injecte automatiquement le code source actuel d’une fonction, ses 10 derniers logs/erreurs, ses clés .env et les règles du sandbox.',
                'use_case' => 'Diagnostiquer rapidement une erreur 500, un blocage sandbox ou un dépassement du timeout 5 s sans copier-coller les logs.',
                'arguments' => [
                    ['name' => 'function_name', 'required' => true, 'description' => 'Slug de la Web Function à analyser.'],
                ],
            ],
            [
                'name' => 'design-collection-schema',
                'description' => 'Analyse vos collections existantes et conçoit un schéma de validation JSON Zenbase strict (types, champs requis, valeurs par défaut).',
                'use_case' => 'Structurer proprement une nouvelle entité métier (ex. invoices, bookings) avant de la créer avec create_collection.',
                'arguments' => [
                    ['name' => 'collection', 'required' => true, 'description' => 'Nom de la collection cible.'],
                    ['name' => 'requirements', 'required' => true, 'description' => 'Champs, contraintes et relations métier.'],
                ],
            ],
            [
                'name' => 'scaffold-crud-module',
                'description' => 'Lit le schéma réel et des exemples de documents d’une collection pour générer un module CRUD typé complet avec @hacp0012/zenbase-sdk.',
                'use_case' => 'Générer en une commande les services, hooks, filtres JSON1 et pagination pour une collection dans React, Next.js ou Vue.',
                'arguments' => [
                    ['name' => 'collection', 'required' => true, 'description' => 'Nom de la collection existante.'],
                    ['name' => 'framework', 'required' => false, 'description' => 'Stack cible (défaut : React + TypeScript).'],
                ],
            ],
            [
                'name' => 'setup-auth-flow',
                'description' => 'Génère un flux d’authentification complet avec zb.auth (Mot de passe, OTP 6 chiffres, onAuthStateChange et protection de routes).',
                'use_case' => 'Mettre en place login, inscription et gestion de session côté frontend en respectant la séparation zb_pub_ / CORS.',
                'arguments' => [
                    ['name' => 'method', 'required' => false, 'description' => 'password, otp ou both (défaut : both).'],
                    ['name' => 'framework', 'required' => false, 'description' => 'Stack frontend cible (défaut : React + TypeScript).'],
                ],
            ],
            [
                'name' => 'build-webhook-function',
                'description' => 'Génère une Web Function PHP sécurisée pour recevoir des webhooks avec vérification HMAC SHA-256 ($context->env) et idempotence.',
                'use_case' => 'Intégrer des événements Stripe, GitHub, Resend ou LemonSqueezy avec vérification de signature et journalisation NoSQL.',
                'arguments' => [
                    ['name' => 'provider', 'required' => true, 'description' => 'Fournisseur du webhook (ex. Stripe, GitHub).'],
                    ['name' => 'function_name', 'required' => false, 'description' => 'Slug souhaité (défaut : <provider>-webhook).'],
                ],
            ],
            [
                'name' => 'audit-app-security',
                'description' => 'Inspecte CORS, permissions MCP, collections sans schéma, fonctions actives, quotas et utilisateurs bloqués pour produire un audit priorisé.',
                'use_case' => 'Check-list de sécurité avant mise en production ou revue périodique de la configuration de votre application Zenbase.',
                'arguments' => [],
            ],
        ];
    }
}
