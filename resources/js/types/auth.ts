export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    is_admin?: boolean;
    is_suspended?: boolean;
    max_apps?: number;
    max_storage_mb?: number | null;
    used_storage_bytes?: number;
    expires_at?: string | null;
    apps_count?: number;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};

export type ZenbaseCorsOrigin = {
    id: number;
    app_id: string;
    origin: string;
    created_at: string;
};

export type ZenbaseFile = {
    id: string;
    app_id: string;
    disk: string;
    folder: string;
    path: string;
    original_name: string;
    size: number;
    mime_type: string;
    url: string;
    created_at: string;
};

export type ZenbaseFunctionLog = {
    timestamp: string;
    status: number;
    duration_ms: number;
    output: string | null;
    error: string | null;
};

export type ZenbaseFunction = {
    id: string;
    app_id: string;
    name: string;
    description: string | null;
    code: string;
    env_variables: Record<string, string> | null;
    logs: ZenbaseFunctionLog[] | null;
    is_active: boolean;
    created_at: string;
    updated_at?: string | null;
};

export type ZenbaseMcpSettings = {
    enabled: boolean;
    read_only: boolean;
    allow_functions: boolean;
    allow_auth_management: boolean;
    allow_storage_write: boolean;
};

export type ZenbaseRateLimitSettings = {
    enabled: boolean;
    key_by: 'app' | 'ip';
    api_per_minute: number;
    auth_per_minute: number;
    functions_per_minute: number;
    storage_per_minute: number;
    mcp_per_minute: number;
};

export type ZenbaseMcpToolInfo = {
    name: string;
    module: string;
    access: 'read' | 'write' | 'destructive';
    active: boolean;
    description: string;
};

export type ZenbaseMcpResourceInfo = {
    uri: string;
    mime_type: string;
    is_template: boolean;
    description: string;
    usage_example: string;
};

export type ZenbaseMcpPromptArgumentInfo = {
    name: string;
    required: boolean;
    description: string;
};

export type ZenbaseMcpPromptInfo = {
    name: string;
    description: string;
    use_case: string;
    arguments: ZenbaseMcpPromptArgumentInfo[];
};

export type ZenbaseAgentSkillInfo = {
    slug: string;
    title: string;
    description: string;
    target_path: string;
    content: string;
};

export type ZenbaseApp = {
    id: string;
    name: string;
    description: string | null;
    public_key: string;
    secret_key?: string;
    api_calls_count: number;
    collections_count?: number;
    tenant_users_count?: number;
    files_count?: number;
    functions_count?: number;
    cors_origins_count?: number;
    logs_count?: number;
    error_logs_count?: number;
    database_size_bytes: number;
    created_at: string | null;
    user?: {
        id: number;
        name: string;
        email: string;
        is_suspended: boolean;
    } | null;
    cors_origins?: ZenbaseCorsOrigin[];
    files?: ZenbaseFile[];
    functions?: ZenbaseFunction[];
    mcp_settings?: ZenbaseMcpSettings;
    rate_limits?: ZenbaseRateLimitSettings;
};

export type ZenbaseSchemaFieldType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array'
    | 'blob';

export type ZenbaseSchemaField = {
    name: string;
    type: ZenbaseSchemaFieldType;
    required: boolean;
    default?: unknown;
    description?: string | null;
};

export type ZenbaseCollectionSchema = {
    strict: boolean;
    fields: ZenbaseSchemaField[];
};

export type ZenbaseCollectionInfo = {
    name: string;
    count: number;
    schema?: ZenbaseCollectionSchema | null;
    created_at: string | null;
};

export type ZenbaseTenantUser = {
    id: string;
    name?: string | null;
    email: string;
    auth_method: string;
    is_blocked: boolean;
    created_at: string | null;
};
