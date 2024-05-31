# Grpc Pool Handler for GraphQL Mesh

Grpc Pool Handler is a handler for [GraphQL Mesh](https://github.com/Urigo/graphql-mesh) that allows integrating gRPC data sources with connection pooling support. This handler is based on the original gRPC handler for GraphQL Mesh and adds the ability to configure connection pools for improved performance and resilience.

## Installation

Before you can use the Grpc Pool Handler, you need to install it along with GraphQL Mesh if you haven't already done so. You can install these using npm or yarn.

```bash
npm install @dmamontov/graphql-mesh-grpc-pool-handler
```

or

```bash
yarn add @dmamontov/graphql-mesh-grpc-pool-handler
```

## Configuration

### Modifying tsconfig.json

To make TypeScript recognize the Grpc Pool Handler, you need to add an alias in your tsconfig.json.

Add the following paths configuration under the compilerOptions in your tsconfig.json file:

```json
{
  "compilerOptions": {
    "paths": {
       "grpc-pool": ["./node_modules/@dmamontov/graphql-mesh-grpc-pool-handler"]
    }
  }
}
```

### Adding the Plugin to GraphQL Mesh

You need to include the Grpc Pool Handler in your GraphQL Mesh configuration file (usually .meshrc.yaml). Below is an example configuration that demonstrates how to use this plugin:

```yaml
handler:
  grpcPool:
    endpoint: '{env.SERVICE_ENDPOINT}'
    source: specs/service.proto
    useHTTPS: true
    requestTimeout: 5000
    deadline: 5000
    prefixQueryMethod: [get, v3get, v2get]
    pool:
      min: 30
      max: 300
    metaData:
      auth: '{env.TOKEN}'
    context:
      "grpc.keepalive_time_ms": 5000
      "grpc.keepalive_timeout_ms": 500
      "grpc.keepalive_permit_without_calls": 1
      "grpc.use_local_subchannel_pool": 0
      "grpc.default_compression_algorithm": 2
      "grpc.initial_reconnect_backoff_ms": 500
      "grpc.max_reconnect_backoff_ms": 1000
```

## Conclusion

Remember, always test your configurations in a development environment before applying them in production to ensure that everything works as expected.