# API Reference

This document provides detailed reference information for all interfaces, types, and configuration options available in the AWS CRUD API construct.

## Table of Contents

- [BaseCrudApi Class](#basecrudapi-class)
- [BaseCrudApiProps Interface](#basecrudapiprops-interface)
- [Operations Configuration](#operations-configuration)
- [Security Configuration](#security-configuration)
- [S3 Integration](#s3-integration)
- [Event System](#event-system)
- [Types and Enums](#types-and-enums)

## BaseCrudApi Class

The main construct class that creates a complete CRUD API infrastructure.

### Constructor

```typescript
new BaseCrudApi(scope: Construct, id: string, props: BaseCrudApiProps)
```

#### Parameters

- `scope` - The parent construct
- `id` - Unique identifier for this construct
- `props` - Configuration properties (see [BaseCrudApiProps](#basecrudapiprops-interface))

#### Properties

```typescript
readonly api: RestApi              // The API Gateway instance
readonly table: ITable             // The DynamoDB table
readonly backendFunction: IFunction // The Lambda function handling operations
readonly globalResource: GlobalCRUDResource    // Global resource handler
readonly individualResource: IndividualCRUDResource // Individual resource handler
```

## BaseCrudApiProps Interface

Main configuration interface for the CRUD API construct.

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `EnvironmentName` | `string` | Environment identifier used for naming and event topics |
| `Api` | `RestApi` | Existing API Gateway instance to attach resources to |
| `ResourcePath` | `string` | URL path segment for this resource (e.g., 'tasks', 'users') |
| `GlobalParent` | `IResource` | Parent API Gateway resource for global operations |
| `Operations` | `BaseCrudApiOperations` | Configuration for CRUD operations to enable |

### Optional Properties

#### Resource Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `IndividualParent` | `IResource` | `globalResource` | Parent resource for individual item operations |
| `IdFieldName` | `string` | `'Id'` | Primary key field name in DynamoDB |
| `ParentFieldName` | `string` | `'ParentId'` | Parent reference field name for hierarchical resources |
| `OwnerFieldName` | `string` | `'UserId'` | Field name for resource ownership |
| `IdResourceName` | `string` | `'id'` | URL parameter name for individual resources |
| `ParentResourceName` | `string` | - | Identifier for parent resource in hierarchical setups |

#### Infrastructure

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `Table` | `ITable` | Auto-created | Existing DynamoDB table to use |
| `Bucket` | `IBucket` | - | S3 bucket for large object storage |
| `BackendFunction` | `IFunction` | Auto-created | Existing Lambda function to use |
| `BackendMemory` | `number` | `1024` | Memory allocation for auto-created Lambda function |
| `BackendTimeout` | `Duration` | `10 seconds` | Timeout for auto-created Lambda function |

#### Advanced Configuration

| Property | Type | Description |
|----------|------|-------------|
| `Validator` | `RequestValidator` | API Gateway request validator |
| `S3Fields` | `{ [key: string]: BaseCrudApiOperationS3FieldConfiguration }` | Configuration for S3-stored fields |
| `TeamMembershipsTable` | `ITable` | Table for team-based access control |
| `TeamResourcesTable` | `ITable` | Table for team resource mappings |
| `Pivot` | `BaseCrudApiOperationPivotConfiguration` | Pivot table configuration |
| `AdditionalParams` | `{ [key: string]: string }` | Additional API Gateway parameters |
| `NoScaffolding` | `boolean` | Disable automatic resource scaffolding |

## Operations Configuration

### BaseCrudApiOperations Interface

```typescript
interface BaseCrudApiOperations {
  Create?: BaseCrudApiOperationConfiguration;
  Read?: BaseCrudApiOperationConfiguration;
  List?: BaseCrudApiOperationConfiguration;      // Public list (all items)
  ListOwned?: BaseCrudApiOperationConfiguration; // User-owned items only
  Update?: BaseCrudApiOperationConfiguration;
  Delete?: BaseCrudApiOperationConfiguration;
}
```

### BaseCrudApiOperationConfiguration Interface

```typescript
interface BaseCrudApiOperationConfiguration {
  OperationName: string;                        // Required: Lambda operation identifier
  IndexName?: string;                           // DynamoDB GSI name for queries
  InputModel?: Model;                           // API Gateway input validation model
  Response?: BaseCrudApiOperationResponseConfiguration; // Custom response configuration
  BackendFunction?: IFunction;                  // Override default Lambda function
  SuccessEvent?: string;                        // IoT event topic suffix
  ParentId?: BaseCrudApiOperationParentConfiguration; // Parent resource configuration
  Security?: BaseCrudApiOperationSecurityConfiguration; // Access control rules
}
```

#### Operation Examples

```typescript
Operations: {
  // Basic create operation
  Create: {
    OperationName: 'createItem'
  },
  
  // List with custom index
  ListOwned: {
    OperationName: 'listUserItems',
    IndexName: 'ByUserId'
  },
  
  // Read with custom security
  Read: {
    OperationName: 'getItem',
    Security: {
      Owner: { Fields: ['id', 'title', 'content', 'private'] },
      Public: { Fields: ['id', 'title', 'content'] }
    }
  },
  
  // Update with success event
  Update: {
    OperationName: 'updateItem',
    SuccessEvent: 'ItemUpdated'
  }
}
```

## Security Configuration

### BaseCrudApiOperationSecurityConfiguration Interface

```typescript
interface BaseCrudApiOperationSecurityConfiguration {
  Owner?: BaseCrudApiOperationSecurityRoleConfiguration;
  Team?: BaseCrudApiOperationSecurityRoleConfiguration;
  Public?: BaseCrudApiOperationSecurityRoleConfiguration;
}
```

### BaseCrudApiOperationSecurityRoleConfiguration Interface

```typescript
interface BaseCrudApiOperationSecurityRoleConfiguration {
  Fields?: string[]; // Array of field names accessible to this role
}
```

#### Security Examples

```typescript
// Field-level access control
Security: {
  Owner: {
    Fields: ['id', 'title', 'content', 'private_notes', 'draft']
  },
  Public: {
    Fields: ['id', 'title', 'content']
  }
}

// Team-based access
Security: {
  Owner: {
    Fields: ['*'] // All fields
  },
  Team: {
    Fields: ['id', 'title', 'content', 'status']
  },
  Public: {
    Fields: ['id', 'title']
  }
}
```

## S3 Integration

### BaseCrudApiOperationS3FieldConfiguration Interface

```typescript
interface BaseCrudApiOperationS3FieldConfiguration {
  Prefix?: string;                    // S3 key prefix
  DataFormat?: 'json' | 'raw';        // Data serialization format
  ContentType?: string;               // MIME content type
}
```

#### S3 Configuration Examples

```typescript
S3Fields: {
  // JSON data storage
  content: {
    Prefix: 'documents/content/',
    DataFormat: 'json',
    ContentType: 'application/json'
  },
  
  // Binary file storage
  attachment: {
    Prefix: 'documents/attachments/',
    DataFormat: 'raw',
    ContentType: 'application/octet-stream'
  },
  
  // Image storage
  image: {
    Prefix: 'images/',
    DataFormat: 'raw',
    ContentType: 'image/jpeg'
  }
}
```

## Event System

### Event Configuration

Events are published to AWS IoT Core when operations complete successfully.

```typescript
{
  Create: {
    OperationName: 'createItem',
    SuccessEvent: 'ItemCreated'  // Publishes to: {EnvironmentName}/events/{userId}/ItemCreated
  }
}
```

### Event Payload

```typescript
interface EventPayload {
  Id: string;        // Resource identifier
  UserId: string;    // User who performed the operation
  EventId: string;   // Unique event identifier
  EventDate: string; // ISO timestamp
}
```

### Event Topic Pattern

Events are published to: `{EnvironmentName}/events/{userId}/{SuccessEvent}`

## Types and Enums

### BaseCrudApiParameterSource Enum

```typescript
enum BaseCrudApiParameterSource {
  PATH = 'path',
  QUERYSTRING = 'querystring',
  HEADER = 'header'
}
```

### BaseCrudApiOperationParentConfiguration Interface

```typescript
interface BaseCrudApiOperationParentConfiguration {
  Param: string;                           // Parameter name
  Source: BaseCrudApiParameterSource;      // Parameter location
}
```

### BaseCrudApiOperationResponseConfiguration Interface

```typescript
interface BaseCrudApiOperationResponseConfiguration {
  StatusCode?: string;                     // HTTP status code
  Fields?: string[];                       // Response field filter
  MatchResponse?: RegExp | string;         // Response pattern matching
  Model?: Model;                           // API Gateway response model
}
```

### BaseCrudApiOperationPivotConfiguration Interface

```typescript
interface BaseCrudApiOperationPivotConfiguration {
  Table: ITable;              // Pivot table reference
  SourceField: string;        // Source field for pivot lookup
  PivotFields: string[];      // Fields to include from pivot table
}
```

## Error Handling

The construct handles common error scenarios:

- **Item Not Found**: Returns 404 with appropriate error message
- **Bad Request**: Returns 400 for invalid input data
- **Unauthorized**: Returns 401/403 for access control violations
- **Internal Server Error**: Returns 500 for unexpected errors

## Performance Considerations

- **DynamoDB**: Uses PAY_PER_REQUEST billing mode by default
- **Lambda**: Default 1024MB memory, 10-second timeout
- **S3**: Objects are stored with configurable prefixes for organization
- **API Gateway**: Supports request validation and response caching

## Best Practices

1. **Security**: Always configure appropriate field-level security
2. **Performance**: Use appropriate DynamoDB indexes for list operations
3. **Events**: Use meaningful event names for real-time integrations
4. **S3**: Use appropriate prefixes and content types for large objects
5. **Monitoring**: Enable CloudWatch logging for debugging
