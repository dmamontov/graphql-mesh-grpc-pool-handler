import { type SchemaComposer } from 'graphql-compose';
import lodashGet from 'lodash.get';
import { type Root } from 'protobufjs';
import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';
import { stringInterpolator, type ResolverData } from '@graphql-mesh/string-interpolation';
import { withCancel } from '@graphql-mesh/utils';
import {
    Metadata,
    type ClientDuplexStream,
    type ClientReadableStream,
    type ClientUnaryCall,
    type MetadataValue,
} from '@grpc/grpc-js';
import { deserializeGoogleGrpcStatusDetails } from '@q42philips/node-grpc-error-details';
import { getGraphQLScalar, isScalarType } from './scalars';

export function getTypeName(
    schemaComposer: SchemaComposer,
    pathWithName: string[] | undefined,
    isInput: boolean,
) {
    if (pathWithName?.length) {
        const baseTypeName = pathWithName.filter(Boolean).join('__');
        if (isScalarType(baseTypeName)) {
            return getGraphQLScalar(baseTypeName);
        }
        if (schemaComposer.isEnumType(baseTypeName)) {
            return baseTypeName;
        }
        return isInput ? baseTypeName + '_Input' : baseTypeName;
    }
    return 'Void';
}

export function addIncludePathResolver(root: Root, includePaths: string[]): void {
    const originalResolvePath = root.resolvePath;
    root.resolvePath = (origin: string, target: string) => {
        if (pathModule.isAbsolute(target)) {
            return target;
        }
        for (const directory of includePaths) {
            const fullPath: string = pathModule.join(directory, target);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }
        const path = originalResolvePath(origin, target);
        if (path === null) {
            console.warn(`${target} not found in any of the include paths ${includePaths}`);
        }
        return path;
    };
}

function isBlob(input: any): input is Blob {
    return input != null && input.stream instanceof Function;
}

export async function addMetaDataToCall(
    callFn: any,
    input: any,
    resolverData: ResolverData,
    metaData: Record<string, string | string[] | Buffer>,
    isResponseStream = false,
    deadline: number = 20_000,
) {
    const callFnArguments: any[] = [];
    if (!isBlob(input)) {
        callFnArguments.push(input);
    }

    if (metaData) {
        const meta = new Metadata();
        for (const [key, value] of Object.entries(metaData)) {
            let metaValue: unknown = value;
            if (Array.isArray(value)) {
                // Extract data from context
                metaValue = lodashGet(resolverData.context, value);
            }

            // Ensure that the metadata is compatible with what node-grpc expects
            if (typeof metaValue !== 'string' && !(metaValue instanceof Buffer)) {
                metaValue = JSON.stringify(metaValue);
            }

            if (typeof metaValue === 'string') {
                metaValue = stringInterpolator.parse(metaValue, resolverData);
            }

            meta.add(key, metaValue as MetadataValue);
        }
        callFnArguments.push(meta);
    }
    if (resolverData?.context) {
        callFnArguments.push({ ...resolverData.context, deadline: Date.now() + deadline });
    }
    return new Promise((resolve, reject) => {
        const call: ClientDuplexStream<any, any> = callFn(
            ...callFnArguments,
            (error: Error, response: ClientUnaryCall | ClientReadableStream<unknown>) => {
                if (error) {
                    reject(modifyReason(error));
                }
                resolve(response);
            },
        );
        if (isResponseStream) {
            let isCancelled = false;
            const responseStreamWithCancel = withCancel(call, () => {
                if (!isCancelled) {
                    call.call?.cancelWithStatus(0, 'Cancelled by GraphQL Mesh');
                    isCancelled = true;
                }
            });
            resolve(responseStreamWithCancel);
            if (isBlob(input)) {
                const blobStream = input.stream();
                (blobStream as any).pipe(call);
            }
        }
    });
}

function modifyReason(error: Error): Error {
    const grpcErrorDetails = deserializeGoogleGrpcStatusDetails(error as any);
    if (!grpcErrorDetails) {
        return error;
    }

    const { details: detailsInfo } = grpcErrorDetails;
    if (detailsInfo.length <= 0) {
        return error;
    }

    const details = detailsInfo[0].toObject() as any;
    if (!details?.reason) {
        return error;
    }

    const match = error.message.match(/^(\d+\s[A-Z_]+)(:\s.*)$/);
    if (!match) {
        return error;
    }

    error.message = match[1] + '(' + details.reason + ')' + match[2];

    return error;
}
