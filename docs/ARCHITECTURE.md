 # Architecture & Design Decisions

This document outlines the architectural decisions and design patterns used in the AWS CRUD API construct.

## Overview

The AWS CRUD API construct is designed to provide a complete, production-ready CRUD API with minimal configuration. It follows AWS Well-Architected Framework principles and serverless best practices.

## Architecture Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   API Gateway   │────▶│ Lambda Function  │────▶│   DynamoDB      │
│                 │     │                  │     │                 │
│ - REST API      │     │ - CRUD Operations│     │ - Primary Store │
│ - Validation    │     │ - Access Control │     │ - GSI Indexes   │
│ - CORS          │     │ - Event Dispatch │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                         │                         
         │                         ▼                         
         │               ┌─────────────────┐                 
         │               │      S3         │                 
         │               │                 │                 
         └──────────────▶│ - Large Objects │                 
                         │ - File Storage  │                 
                         └─────────────────┘                 
                                   │                         
                                   ▼                         
                         ┌─────────────────┐                 
                         │   IoT Core      │                 
                         │                 │                 
                         │ - Event Topics  │                 
                         │ - Real-time     │                 
                         └─────────────────┘                 
```

## Core Design Principles

### 1. **Minimal Configuration**

**Decision**: Provide sensible defaults for all optional configurations
**Rationale**: Reduce cognitive load and setup time for developers
**Implementation**: Auto-create resources (tables, functions) with production-ready settings

```typescript
// Minimal setup - everything else is auto-configured
const crud = new BaseCrudApi(this, 'ItemsCRUD', {
  EnvironmentName: 'prod',
  Api: api,
  ResourcePath: 'items',
  GlobalParent: api.root,
  Operations: {
    Create: { OperationName: 'createItem' }
  }
});
```

### 2. **Resource Ownership Model**

**Decision**: Default to owner-based access control
**Rationale**: Most CRUD APIs need user isolation for security and privacy
**Implementation**: Automatic `UserId` injection and filtering

```typescript
// Automatic owner isolation
CREATE → Sets UserId from authentication context
READ/UPDATE/DELETE → Filters by UserId
LIST → Returns only user's items (ListOwned) or all items (List)
```

### 3. **Flexible Operations**

**Decision**: Allow selective CRUD operation enabling
**Rationale**: Not all resources need all operations (e.g., read-only catalogs)
**Implementation**: Optional operation configuration

```typescript
Operations: {
  Create: { /* config */ },    // Optional
  Read: { /* config */ },      // Optional
  List: { /* config */ },      // Optional - public list
  ListOwned: { /* config */ }, // Optional - user-specific list
  Update: { /* config */ },    // Optional
  Delete: { /* config */ }     // Optional
}
```

### 4. **Separation of Concerns**

**Decision**: Separate global and individual resource handling
**Rationale**: Different operations have different routing and validation needs
**Implementation**: Two resource constructs

- `GlobalCRUDResource`: Handles collection operations (CREATE, LIST)
- `IndividualCRUDResource`: Handles item operations (READ, UPDATE, DELETE)

## Data Storage Strategy

### Primary Storage: DynamoDB

**Decision**: Use DynamoDB as the primary data store
**Rationale**: 
- Serverless and scales automatically
- Consistent with serverless architecture
- Built-in security with IAM
- Cost-effective for most use cases

**Table Design**:
```typescript
// Single table design with GSI for queries
Partition Key: ParentId (for hierarchical) OR Id (for standalone)
Sort Key: Id (for hierarchical) OR undefined (for standalone)
GSI: ByUserId - Enables efficient user-specific queries
```

### Large Object Storage: S3

**Decision**: Optional S3 integration for large fields
**Rationale**: 
- DynamoDB has 400KB item size limit
- S3 is cost-effective for large objects
- Better performance for binary data

**Implementation**:
```typescript
S3Fields: {
  content: {
    Prefix: 'documents/',
    DataFormat: 'json'  // or 'raw' for binary
  }
}
```

## Security Model

### Multi-Level Access Control

**Decision**: Implement role-based field-level security
**Rationale**: Different users need different access levels to the same resource

**Roles**:
- **Owner**: Full access to owned resources
- **Team**: Shared access within team context
- **Public**: Read-only access to specified fields

**Implementation**:
```typescript
Security: {
  Owner: { Fields: ['id', 'title', 'content', 'private'] },
  Team: { Fields: ['id', 'title', 'content'] },
  Public: { Fields: ['id', 'title'] }
}
```

### Authentication Integration

**Decision**: Delegate authentication to API Gateway
**Rationale**: 
- Flexible authentication options (Cognito, Lambda authorizers)
- Standard AWS patterns
- Construct remains auth-agnostic

## Event System Design

### Real-time Notifications

**Decision**: Use AWS IoT Core for event dispatching
**Rationale**:
- Real-time pub/sub capabilities
- Scales to millions of connections
- WebSocket support for browsers
- Mobile SDK integration

**Event Pattern**:
```
Topic: {EnvironmentName}/events/{userId}/{EventType}
Payload: { Id, UserId, EventId, EventDate }
```

## Error Handling Strategy

### Graceful Degradation

**Decision**: Comprehensive error handling with meaningful messages
**Rationale**: Better developer experience and debugging

**Error Categories**:
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource doesn't exist
- **500 Internal Error**: Unexpected failures

## Performance Optimizations

### 1. **DynamoDB Optimization**

- **PAY_PER_REQUEST**: No capacity planning required
- **GSI Design**: Efficient query patterns for common operations
- **Point-in-Time Recovery**: Data protection without performance impact

### 2. **Lambda Optimization**

- **Right-sized Memory**: Default 1024MB balances cost and performance
- **Connection Reuse**: Persistent DynamoDB and S3 clients
- **Environment Variables**: Runtime configuration

### 3. **API Gateway Optimization**

- **Request Validation**: Reduce Lambda invocations for invalid requests
- **Response Compression**: Smaller payloads
- **Caching Support**: Optional response caching

## Scalability Considerations

### Horizontal Scaling

**DynamoDB**: Automatically scales based on demand
**Lambda**: Concurrent execution scales to meet demand
**API Gateway**: Handles millions of requests per second
**S3**: Unlimited storage capacity

### Cost Optimization

- **Pay-per-use**: All services scale to zero when not used
- **Efficient Queries**: GSI design minimizes scan operations
- **S3 Intelligent Tiering**: Automatic cost optimization for stored objects

## Monitoring & Observability

### Built-in Logging

**Decision**: Use AWS PowerTools for structured logging
**Rationale**: 
- Consistent log format
- Better searchability in CloudWatch
- Performance tracing

**Implementation**:
```typescript
const logger = new Logger();
logger.info('Processing request', { UserId, Operation });
```

### CloudWatch Integration

- **Metrics**: Automatic Lambda and API Gateway metrics
- **Logs**: Structured logging with log retention
- **Alarms**: Can be configured for error rates and latency

## Extensibility Patterns

### 1. **Custom Backend Functions**

Allow users to provide their own Lambda functions:
```typescript
const customFunction = new Function(/* ... */);
const crud = new BaseCrudApi(this, 'Custom', {
  // ...
  BackendFunction: customFunction
});
```

### 2. **Custom Tables**

Support existing DynamoDB tables:
```typescript
const existingTable = Table.fromTableName(/* ... */);
const crud = new BaseCrudApi(this, 'Custom', {
  // ...
  Table: existingTable
});
```

### 3. **Validation Integration**

Support API Gateway request validators:
```typescript
const validator = new RequestValidator(/* ... */);
const crud = new BaseCrudApi(this, 'Validated', {
  // ...
  Validator: validator
});
```

## Testing Strategy

### Unit Testing

- **Lambda Functions**: Mock DynamoDB and S3 operations
- **Construct**: CDK assertions for infrastructure
- **Integration**: Test complete request/response cycles

### Example Test Structure

```typescript
describe('ItemsCrud', () => {
  it('should create item with correct ownership', async () => {
    // Arrange
    const mockDynamoDB = mockClient(DynamoDBDocumentClient);
    
    // Act
    const result = await itemsCrud.createItem(testData);
    
    // Assert
    expect(result.UserId).toBe(testUserId);
  });
});
```

## Migration Considerations

### Backward Compatibility

**Decision**: Maintain backward compatibility for minor versions
**Strategy**: 
- Additive changes only
- Deprecation warnings before removal
- Migration guides for breaking changes

### Version Management

**Pattern**: Semantic versioning (MAJOR.MINOR.PATCH)
- **PATCH**: Bug fixes, no API changes
- **MINOR**: New features, backward compatible
- **MAJOR**: Breaking changes, migration required

## Future Considerations

### Planned Enhancements

1. **GraphQL Support**: Alternative to REST API
2. **Advanced Caching**: Redis integration for high-performance scenarios
3. **Batch Operations**: Bulk create/update/delete operations
4. **Search Integration**: OpenSearch/Elasticsearch integration
5. **Audit Logging**: Comprehensive audit trail capabilities

### Technology Evolution

- **AWS SDK v3**: Migration for better performance and tree-shaking
- **CDK v3**: When available, maintain compatibility
- **New AWS Services**: Integration with emerging AWS capabilities

## CDK Version Parity Strategy

### Synchronized Versioning

This package follows a synchronized versioning approach with AWS CDK to ensure compatibility and reduce confusion:

**Version Alignment:**
- Major versions align with AWS CDK major versions (e.g., v2.x for CDK v2.x)
- Minor and patch versions follow semantic versioning for features and fixes
- When new AWS CDK versions are released, this package is automatically updated

**Automated Updates:**
- Dependabot is configured to monitor AWS CDK releases
- Upon new `aws-cdk-lib` versions, an automated workflow:
  1. Updates the CDK dependency version
  2. Runs tests to ensure compatibility
  3. Publishes a new package version matching the CDK version number
  4. Updates the changelog with dependency changes

**Benefits:**
- **Simplified Compatibility**: Users can easily match package versions to their CDK version
- **Rapid Updates**: New CDK features are available quickly
- **Reduced Maintenance**: Automated process reduces manual intervention
- **Clear Dependencies**: Version numbers clearly indicate CDK compatibility

**Implementation:**
- Dependabot configuration monitors `aws-cdk-lib` and `constructs`
- GitHub Actions workflow handles automated version bumping and publishing
- Semantic versioning ensures breaking changes are properly communicated

**User Guidance:**
```bash
# For CDK v2.159.x, use:
npm install @nerdiyland/aws-crud-api-rest@^2.159.0

# For CDK v2.160.x, use:
npm install @nerdiyland/aws-crud-api-rest@^2.160.0
```

This strategy ensures developers always have access to the latest CDK features while maintaining clear compatibility expectations.
