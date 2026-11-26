import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import jsonWorker from 'monaco-editor/languages/features/json/json.worker.js?worker';
import tsWorker from 'monaco-editor/languages/features/typescript/ts.worker.js?worker';
import { useEffect, useId, useRef } from 'react';
import { useAppearance } from '@/hooks/use-appearance';
import type { ZenbaseSchemaField } from '@/types';

if (typeof window !== 'undefined') {
    (
        window as unknown as {
            MonacoEnvironment?: {
                getWorker: (_moduleId: string, label: string) => Worker;
            };
        }
    ).MonacoEnvironment = {
        getWorker(_moduleId: string, label: string): Worker {
            if (label === 'json') {
                return new jsonWorker();
            }
            if (label === 'typescript' || label === 'javascript') {
                return new tsWorker();
            }

            return new editorWorker();
        },
    };
}

loader.config({ monaco });

let themesRegistered = false;
let phpLanguageConfigured = false;

function ensureMonokaiThemes(monacoInstance: typeof monaco): void {
    if (themesRegistered) {
        return;
    }
    themesRegistered = true;

    monacoInstance.editor.defineTheme('zenbase-monokai-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: '', foreground: 'F8F8F2', background: '1E1F1C' },
            { token: 'comment', foreground: '75715E', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'F92672', fontStyle: 'bold' },
            { token: 'operator', foreground: 'F92672' },
            { token: 'delimiter', foreground: 'F8F8F2' },
            { token: 'string', foreground: 'E6DB74' },
            { token: 'string.key.json', foreground: 'F92672' },
            { token: 'string.value.json', foreground: 'E6DB74' },
            { token: 'number', foreground: 'AE81FF' },
            { token: 'constant', foreground: 'AE81FF' },
            { token: 'variable', foreground: 'FD971F' },
            { token: 'variable.predefined', foreground: '66D9EF' },
            { token: 'type', foreground: '66D9EF', fontStyle: 'italic' },
            { token: 'function', foreground: 'A6E22E' },
            { token: 'identifier', foreground: 'F8F8F2' },
            { token: 'tag', foreground: 'F92672' },
            { token: 'attribute.name', foreground: 'A6E22E' },
            { token: 'attribute.value', foreground: 'E6DB74' },
        ],
        colors: {
            'editor.background': '#1E1F1C',
            'editor.foreground': '#F8F8F2',
            'editorLineNumber.foreground': '#75715E',
            'editorLineNumber.activeForeground': '#A6E22E',
            'editorCursor.foreground': '#F8F8F0',
            'editor.selectionBackground': '#49483E',
            'editor.lineHighlightBackground': '#272822',
            'editorIndentGuide.background1': '#3B3A32',
            'editorWidget.background': '#272822',
            'editorWidget.border': '#49483E',
        },
    });

    monacoInstance.editor.defineTheme('zenbase-monokai-light', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: '', foreground: '272822', background: 'FAFAF8' },
            { token: 'comment', foreground: '8F8B77', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'D81B60', fontStyle: 'bold' },
            { token: 'operator', foreground: 'D81B60' },
            { token: 'delimiter', foreground: '272822' },
            { token: 'string', foreground: '9E7700' },
            { token: 'string.key.json', foreground: 'D81B60' },
            { token: 'string.value.json', foreground: '9E7700' },
            { token: 'number', foreground: '7C3AED' },
            { token: 'constant', foreground: '7C3AED' },
            { token: 'variable', foreground: 'C25E00' },
            { token: 'variable.predefined', foreground: '00838F' },
            { token: 'type', foreground: '00838F', fontStyle: 'italic' },
            { token: 'function', foreground: '4E8A06' },
            { token: 'identifier', foreground: '272822' },
            { token: 'tag', foreground: 'D81B60' },
            { token: 'attribute.name', foreground: '4E8A06' },
            { token: 'attribute.value', foreground: '9E7700' },
        ],
        colors: {
            'editor.background': '#FAFAF8',
            'editor.foreground': '#272822',
            'editorLineNumber.foreground': '#9E9A87',
            'editorLineNumber.activeForeground': '#D81B60',
            'editorCursor.foreground': '#272822',
            'editor.selectionBackground': '#E8E6DF',
            'editor.lineHighlightBackground': '#F2F1EC',
            'editorIndentGuide.background1': '#E5E4DE',
            'editorWidget.background': '#FFFFFF',
            'editorWidget.border': '#E2E0D8',
        },
    });
}

function ensurePhpTokenizerAndCompletions(monacoInstance: typeof monaco): void {
    if (phpLanguageConfigured) {
        return;
    }
    phpLanguageConfigured = true;

    const existingLangs = monacoInstance.languages.getLanguages();
    if (!existingLangs.some((l) => l.id === 'php')) {
        monacoInstance.languages.register({ id: 'php' });
    }

    // Monarch tokenizer that highlights PHP both with and without an opening `<?php` tag
    monacoInstance.languages.setMonarchTokensProvider('php', {
        defaultToken: '',
        tokenPostfix: '.php',
        keywords: [
            'abstract',
            'and',
            'array',
            'as',
            'break',
            'callable',
            'case',
            'catch',
            'class',
            'clone',
            'const',
            'continue',
            'declare',
            'default',
            'do',
            'echo',
            'else',
            'elseif',
            'empty',
            'enddeclare',
            'endfor',
            'endforeach',
            'endif',
            'endswitch',
            'endwhile',
            'extends',
            'final',
            'finally',
            'fn',
            'for',
            'foreach',
            'function',
            'global',
            'goto',
            'if',
            'implements',
            'instanceof',
            'insteadof',
            'interface',
            'isset',
            'list',
            'match',
            'namespace',
            'new',
            'or',
            'print',
            'private',
            'protected',
            'public',
            'readonly',
            'return',
            'static',
            'switch',
            'throw',
            'trait',
            'try',
            'unset',
            'use',
            'var',
            'while',
            'xor',
            'yield',
        ],
        constants: ['true', 'false', 'null', 'TRUE', 'FALSE', 'NULL'],
        builtinFunctions: [
            'json_encode',
            'json_decode',
            'base64_encode',
            'base64_decode',
            'array_map',
            'array_filter',
            'array_merge',
            'array_keys',
            'array_values',
            'array_slice',
            'in_array',
            'is_array',
            'is_string',
            'is_numeric',
            'count',
            'str_contains',
            'str_starts_with',
            'str_ends_with',
            'strtolower',
            'strtoupper',
            'trim',
            'ltrim',
            'rtrim',
            'explode',
            'implode',
            'sprintf',
            'preg_match',
            'preg_replace',
            'hash',
            'hash_hmac',
            'time',
            'date',
            'now',
            'collection',
            'where',
            'orderBy',
            'limit',
            'offset',
            'get',
            'find',
            'create',
            'update',
            'delete',
            'upload',
            'put',
            'list',
            'check',
            'user',
            'id',
            'email',
            'getSchema',
            'setSchema',
            'send',
            'queue',
            'withHeaders',
            'withToken',
            'timeout',
            'post',
            'patch',
            'request',
        ],
        tokenizer: {
            root: [
                [/<\?php/, 'tag'],
                [/\?>/, 'tag'],
                [/\/\/.*$/, 'comment'],
                [/#.*$/, 'comment'],
                [/\/\*/, 'comment', '@comment'],
                [/\$(?:context|event|this)\b/, 'variable.predefined'],
                [/\$[a-zA-Z_]\w*/, 'variable'],
                [
                    /[a-zA-Z_]\w*(?=\s*\()/,
                    {
                        cases: {
                            '@keywords': 'keyword',
                            '@builtinFunctions': 'function',
                            '@default': 'function',
                        },
                    },
                ],
                [
                    /[a-zA-Z_]\w*/,
                    {
                        cases: {
                            '@keywords': 'keyword',
                            '@constants': 'constant',
                            '@builtinFunctions': 'function',
                            '@default': 'identifier',
                        },
                    },
                ],
                [/\d+\.\d+([eE][-+]?\d+)?/, 'number'],
                [/0[xX][0-9a-fA-F]+/, 'number'],
                [/\d+/, 'number'],
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/'([^'\\]|\\.)*$/, 'string.invalid'],
                [/"/, 'string', '@stringDouble'],
                [/'/, 'string', '@stringSingle'],
                [
                    /->|=>|::|===|!==|==|!=|<=|>=|\?\?|\+|-|\*|\/|=|<|>|!|&&|\|\|/,
                    'operator',
                ],
                [/[{}()[\]]/, '@brackets'],
                [/[;,.]/, 'delimiter'],
            ],
            comment: [
                [/[^/*]+/, 'comment'],
                [/\*\//, 'comment', '@pop'],
                [/[/*]/, 'comment'],
            ],
            stringDouble: [
                [/[^\\"$]+/, 'string'],
                [/\$[a-zA-Z_]\w*/, 'variable'],
                [/\\./, 'string.escape'],
                [/"/, 'string', '@pop'],
            ],
            stringSingle: [
                [/[^\\']+/, 'string'],
                [/\\./, 'string.escape'],
                [/'/, 'string', '@pop'],
            ],
        },
    });

    monacoInstance.languages.registerCompletionItemProvider('php', {
        triggerCharacters: ['$', '>', ':', "'", '"'],
        provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range: monaco.IRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const suggestions: Array<{
                label: string;
                kind: monaco.languages.CompletionItemKind;
                insertText: string;
                detail: string;
                documentation: string;
                insertTextRules?: monaco.languages.CompletionItemInsertTextRule;
            }> = [
                {
                    label: '$context->database->collection',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText:
                        "\\$context->database->collection('${1:nom_collection}')",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase NoSQL CollectionQueryBuilder',
                    documentation:
                        "Sélectionne une collection NoSQL dans la base SQLite isolée de l'application.",
                },
                {
                    label: '$context->database->collection()->create',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText:
                        "\\$context->database->collection('${1:items}')->create([\n\t'${2:key}' => ${3:'value'},\n])",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Insérer un document JSON (NoSQL)',
                    documentation:
                        'Crée un nouveau document JSON dans la collection et retourne le document créé avec son UUID.',
                },
                {
                    label: '$context->database->collection()->where()->get',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText:
                        "\\$context->database->collection('${1:items}')\n\t->where('${2:status}', '==', '${3:active}')\n\t->orderBy('created_at', 'desc')\n\t->limit(${4:25})\n\t->get()",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Requête filtrée NoSQL JSON1',
                    documentation:
                        'Filtre, trie et récupère les documents JSON de la collection.',
                },
                {
                    label: '$context->database->collection()->find',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText:
                        "\\$context->database->collection('${1:items}')->find(${2:\\$id})",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Trouver un document par UUID',
                    documentation:
                        'Récupère un document unique par son identifiant ou null.',
                },
                {
                    label: '$context->database->collection()->update',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText:
                        "\\$context->database->collection('${1:items}')->update(${2:\\$id}, [\n\t'${3:field}' => ${4:'newValue'},\n])",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Mettre à jour un document NoSQL',
                    documentation:
                        'Met à jour partiellement les champs JSON du document.',
                },
                {
                    label: '$context->database->collection()->delete',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText:
                        "\\$context->database->collection('${1:items}')->delete(${2:\\$id})",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Supprimer un document NoSQL',
                    documentation: 'Supprime un document par son UUID.',
                },
                {
                    label: '$context->storage->upload',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText:
                        "\\$context->storage->upload('${1:reports/output.json}', ${2:\\$contents}, '${3:application/json}')",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase Storage — Enregistrer un fichier',
                    documentation:
                        "Stocke un fichier dans l'espace isolé de l'application et retourne son URL publique.",
                },
                {
                    label: '$context->storage->list',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText: "\\$context->storage->list('${1:/}')",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase Storage — Lister les fichiers',
                    documentation:
                        "Liste les fichiers stockés dans l'application.",
                },
                {
                    label: '$context->storage->delete',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText: '\\$context->storage->delete(${1:\\$fileId})',
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase Storage — Supprimer un fichier',
                    documentation: 'Supprime un fichier par ID ou chemin.',
                },
                {
                    label: '$context->auth->user',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText: '\\$context->auth->user()',
                    detail: 'Zenbase Auth — Utilisateur courant',
                    documentation:
                        "Retourne le tableau de l'utilisateur authentifié (id, email, auth_method) ou null.",
                },
                {
                    label: '$context->auth->check',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText: '\\$context->auth->check()',
                    detail: 'Zenbase Auth — Vérifier la session',
                    documentation:
                        'Retourne true si la requête provient d’un utilisateur authentifié.',
                },
                {
                    label: '$context->auth->id',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText: '\\$context->auth->id()',
                    detail: 'Zenbase Auth — ID Utilisateur',
                    documentation:
                        "Retourne l'UUID de l'utilisateur authentifié ou null.",
                },
                {
                    label: '$context->auth->email',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText: '\\$context->auth->email()',
                    detail: 'Zenbase Auth — Email Utilisateur',
                    documentation:
                        "Retourne l'adresse e-mail de l'utilisateur authentifié ou null.",
                },
                {
                    label: '$context->mail->send',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText:
                        "\\$context->mail->send([\n\t'to' => ${1:'client@exemple.com'},\n\t'subject' => ${2:'Bienvenue !'},\n\t'html' => ${3:'<p>Bonjour !</p>'},\n])",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase Mail — Envoyer un e-mail',
                    documentation:
                        "Envoie immédiatement un e-mail sécurisé (max 5/invocation, 10 destinataires, 30/min par application).",
                },
                {
                    label: '$context->mail->queue',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText:
                        "\\$context->mail->queue([\n\t'to' => ${1:'client@exemple.com'},\n\t'subject' => ${2:'Notification'},\n\t'text' => ${3:'Votre message texte'},\n])",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase Mail — Envoyer en file d’attente',
                    documentation:
                        "Met l'e-mail en file d'attente (recommandé pour ne pas ralentir l'invocation).",
                },
                {
                    label: '$context->http->get',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText:
                        "\\$context->http->get('${1:https://api.exemple.com/v1/resource}', [${2}])",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase HTTP — Requête HTTPS GET (anti-SSRF)',
                    documentation:
                        "Exécute une requête HTTPS GET sécurisée (port 443, sans redirection, protection anti-SSRF) et retourne ['status', 'ok', 'body', 'json', 'headers'].",
                },
                {
                    label: '$context->http->post',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText:
                        "\\$context->http\n\t->withToken(\\$context->env['${1:API_KEY}'] ?? '')\n\t->post('${2:https://api.exemple.com/v1/endpoint}', [\n\t\t'${3:key}' => ${4:'value'},\n\t])",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase HTTP — Requête HTTPS POST (anti-SSRF)',
                    documentation:
                        "Exécute une requête HTTPS POST JSON sécurisée (max 5 requêtes/invocation, timeout 1-4s).",
                },
                {
                    label: '$context->http->withToken',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText:
                        "\\$context->http->withToken(\\$context->env['${1:API_TOKEN}'] ?? '')",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase HTTP — Authentification Bearer',
                    documentation:
                        "Ajoute l'en-tête Authorization: Bearer <token> sur une instance clonée du client HTTP.",
                },
                {
                    label: '$context->http->withHeaders',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText:
                        "\\$context->http->withHeaders(['${1:X-Custom-Header}' => ${2:'value'}])",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase HTTP — En-têtes personnalisés',
                    documentation:
                        'Ajoute des en-têtes HTTP personnalisés sur une instance clonée du client HTTP.',
                },
                {
                    label: '$context->http->timeout',
                    kind: monacoInstance.languages.CompletionItemKind.Method,
                    insertText: '\\$context->http->timeout(${1:3})',
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase HTTP — Délai maximal (1 à 4 s)',
                    documentation:
                        "Définit le timeout en secondes (borné entre 1 et 4 secondes).",
                },
                {
                    label: "$context->env['KEY']",
                    kind: monacoInstance.languages.CompletionItemKind.Property,
                    insertText:
                        "\\$context->env['${1:NOM_VARIABLE}'] ?? '${2:default}'",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Zenbase Env — Variable secrète',
                    documentation:
                        "Lit une variable d'environnement configurée pour cette fonction ou cette application.",
                },
                {
                    label: "$event['payload']",
                    kind: monacoInstance.languages.CompletionItemKind.Variable,
                    insertText: "\\$event['payload']['${1:key}'] ?? ${2:null}",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Payload JSON entrant',
                    documentation:
                        'Données envoyées lors de l’appel SDK zb.functions.invoke().',
                },
                {
                    label: "$event['headers']",
                    kind: monacoInstance.languages.CompletionItemKind.Variable,
                    insertText: "\\$event['headers']",
                    detail: 'En-têtes HTTP de la requête',
                    documentation: 'Tableau associatif des en-têtes HTTP.',
                },
                {
                    label: 'return response (Zenbase HTTP)',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText:
                        "return [\n\t'status' => ${1:200},\n\t'data' => [\n\t\t'success' => true,\n\t\t${2:'result' => \\$data},\n\t],\n];",
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: 'Structure de réponse HTTP Zenbase',
                    documentation:
                        'Retourne un code HTTP personnalisé et un objet JSON data.',
                },
                ...[
                    [
                        'json_encode',
                        'json_encode(${1:\\$value}, JSON_UNESCAPED_UNICODE)',
                        'Encode une valeur en JSON',
                    ],
                    [
                        'json_decode',
                        'json_decode(${1:\\$json}, true)',
                        'Décode une chaîne JSON en tableau associatif',
                    ],
                    [
                        'base64_encode',
                        'base64_encode(${1:\\$data})',
                        'Encode une chaîne en Base64 (utile pour les BLOBs)',
                    ],
                    [
                        'base64_decode',
                        'base64_decode(${1:\\$data}, true)',
                        'Décode une chaîne Base64',
                    ],
                    [
                        'array_map',
                        'array_map(fn(\\$item) => ${1:\\$item}, ${2:\\$array})',
                        'Transforme chaque élément d’un tableau',
                    ],
                    [
                        'array_filter',
                        'array_filter(${1:\\$array}, fn(\\$item) => ${2:true})',
                        'Filtre les éléments d’un tableau',
                    ],
                    [
                        'array_merge',
                        'array_merge(${1:\\$a}, ${2:\\$b})',
                        'Fusionne plusieurs tableaux',
                    ],
                    [
                        'str_contains',
                        'str_contains(${1:\\$haystack}, ${2:\\$needle})',
                        'Vérifie si une chaîne contient une sous-chaîne',
                    ],
                    [
                        'strtolower',
                        'strtolower(${1:\\$str})',
                        'Convertit en minuscules',
                    ],
                    [
                        'strtoupper',
                        'strtoupper(${1:\\$str})',
                        'Convertit en majuscules',
                    ],
                    [
                        'trim',
                        'trim(${1:\\$str})',
                        'Supprime les espaces en début et fin',
                    ],
                    [
                        'sprintf',
                        "sprintf('${1:%s}', ${2:\\$val})",
                        'Formate une chaîne',
                    ],
                    [
                        'hash_hmac',
                        "hash_hmac('sha256', ${1:\\$data}, ${2:\\$secret})",
                        'Calcule un HMAC SHA-256',
                    ],
                    ['date', "date('c')", 'Formate une date ISO-8601'],
                    ['time', 'time()', 'Timestamp Unix actuel'],
                ].map(([fnName, snippet, doc]) => ({
                    label: fnName,
                    kind: monacoInstance.languages.CompletionItemKind.Function,
                    insertText: snippet,
                    insertTextRules:
                        monacoInstance.languages.CompletionItemInsertTextRule
                            .InsertAsSnippet,
                    detail: `PHP Standard · ${fnName}()`,
                    documentation: doc,
                })),
            ];

            return {
                suggestions: suggestions.map((s) => ({
                    ...s,
                    range,
                })),
            };
        },
    });
}

function getDefaultSnippetForField(field: ZenbaseSchemaField): string {
    switch (field.type) {
        case 'string':
            return `"${field.default !== undefined ? String(field.default) : ''}"`;
        case 'number':
            return `${field.default !== undefined ? Number(field.default) : 0}`;
        case 'boolean':
            return `${field.default !== undefined ? Boolean(field.default) : true}`;
        case 'array':
            return '[]';
        case 'object':
            return '{}';
        case 'blob':
            return '{\n\t\t"__type": "blob",\n\t\t"mime_type": "application/octet-stream",\n\t\t"name": "file.bin",\n\t\t"data": ""\n\t}';
        default:
            return '""';
    }
}

export type MonacoCodeEditorProps = {
    value: string;
    onChange?: (value: string) => void;
    language?: 'php' | 'json' | 'typescript' | 'javascript' | 'markdown';
    height?: string | number;
    readOnly?: boolean;
    edgeToEdge?: boolean;
    compact?: boolean;
    className?: string;
    schemaFields?: ZenbaseSchemaField[] | null;
    envKeys?: string[];
};

export function MonacoCodeEditor({
    value,
    onChange,
    language = 'json',
    height = 260,
    readOnly = false,
    edgeToEdge = false,
    compact = false,
    className = '',
    schemaFields = null,
    envKeys = [],
}: MonacoCodeEditorProps) {
    const { resolvedAppearance } = useAppearance();
    const editorId = useId();
    const safeEditorId = editorId.replace(/[^a-zA-Z0-9_-]/g, '');
    const modelPath = `zenbase://editor/${safeEditorId}.${language}`;
    const activeTheme =
        resolvedAppearance === 'dark'
            ? 'zenbase-monokai-dark'
            : 'zenbase-monokai-light';

    const disposableRef = useRef<monaco.IDisposable | null>(null);

    useEffect(() => {
        if (disposableRef.current) {
            disposableRef.current.dispose();
            disposableRef.current = null;
        }

        if (language === 'json' && schemaFields && schemaFields.length > 0) {
            const properties: Record<string, Record<string, unknown>> = {};
            const required: string[] = [];

            for (const field of schemaFields) {
                if (field.required) {
                    required.push(field.name);
                }

                if (field.type === 'blob') {
                    properties[field.name] = {
                        type: 'object',
                        description:
                            field.description ||
                            'Champ binaire BLOB Zenbase (__type: "blob", data: Base64)',
                        required: ['__type', 'data'],
                        properties: {
                            __type: { type: 'string', enum: ['blob'] },
                            mime_type: { type: 'string' },
                            name: { type: ['string', 'null'] },
                            size: { type: 'number' },
                            data: {
                                type: 'string',
                                description: 'Contenu encodé en Base64',
                            },
                        },
                    };
                } else {
                    properties[field.name] = {
                        type: field.type,
                        description:
                            field.description ||
                            `Champ ${field.type} (${field.required ? 'requis' : 'optionnel'})`,
                    };
                }
            }

            // Safely configure jsonDefaults (on monaco.json in v0.57+ or monaco.languages.json in older builds)
            try {
                type JsonNamespace = {
                    jsonDefaults?: {
                        setDiagnosticsOptions?: (options: unknown) => void;
                    };
                };

                const jsonNamespace =
                    (monaco as unknown as { json?: JsonNamespace })?.json ??
                    (
                        monaco.languages as unknown as {
                            json?: JsonNamespace;
                        }
                    )?.json;

                jsonNamespace?.jsonDefaults?.setDiagnosticsOptions?.({
                    validate: true,
                    allowComments: false,
                    enableSchemaRequest: false,
                    schemas: [
                        {
                            uri: `http://zenbase.local/schemas/${safeEditorId}.json`,
                            fileMatch: [modelPath],
                            schema: {
                                type: 'object',
                                properties,
                                required,
                            },
                        },
                    ],
                });
            } catch {
                // Ignore if jsonDefaults is not exposed in this Monaco build
            }

            disposableRef.current =
                monaco.languages.registerCompletionItemProvider('json', {
                    triggerCharacters: ['"', '{', ',', '\n', ' '],
                    provideCompletionItems: (model, position) => {
                        const word = model.getWordUntilPosition(position);
                        const lineContent = model.getLineContent(
                            position.lineNumber,
                        );
                        const charBefore =
                            lineContent[word.startColumn - 2] ?? '';
                        const charAfter = lineContent[word.endColumn - 1] ?? '';

                        const range: monaco.IRange = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn:
                                charBefore === '"'
                                    ? word.startColumn - 1
                                    : word.startColumn,
                            endColumn:
                                charAfter === '"'
                                    ? word.endColumn + 1
                                    : word.endColumn,
                        };

                        return {
                            suggestions: schemaFields.map((field) => ({
                                label: field.name,
                                kind: monaco.languages.CompletionItemKind.Field,
                                detail: `Schéma Collection · ${field.type.toUpperCase()}${field.required ? ' (Requis)' : ' (Optionnel)'}`,
                                documentation:
                                    field.description ||
                                    `Insère le champ « ${field.name} » de type ${field.type}.`,
                                insertText: `"${field.name}": ${getDefaultSnippetForField(field)}`,
                                insertTextRules:
                                    monaco.languages
                                        .CompletionItemInsertTextRule
                                        .InsertAsSnippet,
                                range,
                            })),
                        };
                    },
                });
        } else if (language === 'php' && envKeys.length > 0) {
            disposableRef.current =
                monaco.languages.registerCompletionItemProvider('php', {
                    triggerCharacters: ["'", '"', '['],
                    provideCompletionItems: (model, position) => {
                        const word = model.getWordUntilPosition(position);
                        const range: monaco.IRange = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn: word.startColumn,
                            endColumn: word.endColumn,
                        };

                        return {
                            suggestions: envKeys.map((key) => ({
                                label: `$context->env['${key}']`,
                                kind: monaco.languages.CompletionItemKind
                                    .Constant,
                                detail: "Variable d'environnement configurée",
                                documentation: `Accède à la variable d'environnement secrète « ${key} ».`,
                                insertText: `\\$context->env['${key}']`,
                                insertTextRules:
                                    monaco.languages
                                        .CompletionItemInsertTextRule
                                        .InsertAsSnippet,
                                range,
                            })),
                        };
                    },
                });
        }

        return () => {
            if (disposableRef.current) {
                disposableRef.current.dispose();
                disposableRef.current = null;
            }
        };
    }, [language, schemaFields, envKeys, modelPath, safeEditorId]);

    return (
        <div
            className={`overflow-hidden ${
                edgeToEdge
                    ? 'h-full w-full rounded-none border-0'
                    : 'rounded-lg'
            } ${className}`}
        >
            <Editor
                key={editorId}
                path={modelPath}
                height={height}
                language={language}
                value={value}
                theme={activeTheme}
                beforeMount={(monacoInstance) => {
                    ensureMonokaiThemes(monacoInstance);
                    ensurePhpTokenizerAndCompletions(monacoInstance);
                }}
                onChange={(val) => {
                    if (onChange) {
                        onChange(val ?? '');
                    }
                }}
                options={{
                    readOnly,
                    fontFamily:
                        "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: compact ? 12 : 13,
                    lineHeight: compact ? 20 : 21,
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    padding: compact
                        ? { top: 6, bottom: 6 }
                        : { top: 12, bottom: 12 },
                    renderLineHighlight: compact ? 'gutter' : 'all',
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    formatOnPaste: true,
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: true,
                    },
                    ...(compact
                        ? {
                              lineNumbersMinChars: 2,
                              lineDecorationsWidth: 6,
                              glyphMargin: false,
                              folding: false,
                              overviewRulerLanes: 0,
                              overviewRulerBorder: false,
                              hideCursorInOverviewRuler: true,
                              scrollbar: {
                                  verticalScrollbarSize: 8,
                                  horizontalScrollbarSize: 8,
                                  alwaysConsumeMouseWheel: false,
                              },
                          }
                        : {}),
                }}
            />
        </div>
    );
}
