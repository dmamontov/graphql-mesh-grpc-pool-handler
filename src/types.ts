export interface GrpcPoolHandler {
    endpoint: string;
    pool: GrpcPool;
    source?: ProtoFilePath | string;
    requestTimeout?: number;
    credentialsSsl?: GrpcPoolCredentialsSsl;
    useHTTPS?: boolean;
    deadline?: number;
    metaData?: Record<string, any>;
    prefixQueryMethod?: string[];
    schemaHeaders?: Record<string, any>;
    context?: Record<string, any>;
}

export interface GrpcPoolCredentialsSsl {
    rootCA?: string;
    certChain?: string;
    privateKey?: string;
}

export interface GrpcPool {
    min: number;
    max: number;
}

export interface ProtoFilePath {
    file: string;
    load?: LoadOptions;
}

export interface LoadOptions {
    defaults?: boolean;
    includeDirs?: string[];
}
