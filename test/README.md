# AWS CRUD API Infrastructure Testing

This directory contains comprehensive infrastructure tests for the AWS CDK CRUD API construct. The tests validate that the infrastructure resources are created correctly, with proper configurations, security, and business logic implementation.

## Overview

The test suite focuses on validating business-critical infrastructure aspects rather than shallow tests like file existence or basic type checking. All tests validate actual AWS resource configurations and ensure that the VTL mapping templates, IAM permissions, and API Gateway integrations work correctly.

## Test Structure

```
test/
├── infrastructure/           # Infrastructure-specific tests
│   ├── base-api.test.ts                     # BaseApi construct tests
│   ├── base-crud.test.ts                    # BaseCrudApi construct tests
│   ├── vtl-mapping-templates.test.ts        # VTL template validation
│   ├── api-gateway-methods.test.ts          # API Gateway method configuration
│   ├── lambda-payload-transformation.test.ts # Lambda payload structure tests
│   ├── end-to-end-integration.test.ts       # Complete integration flows
│   └── configuration-validation.test.ts     # Configuration edge cases
├── setup.ts                 # Test setup and utilities
└── README.md               # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Infrastructure Tests Only
```bash
npm run test:infrastructure
```

### With Coverage
```bash
npm run test:coverage:infrastructure
```

### Watch Mode
```bash
npm run test:watch:infrastructure
```

### Verbose Output
```bash
npm run test:infrastructure:verbose
```

## Test Categories

### 1. BaseApi Infrastructure Tests (`base-api.test.ts`)

Tests the foundational API Gateway setup:

- **API Gateway Configuration**: Validates REST API creation with correct settings
- **CORS Configuration**: Ensures proper CORS headers and preflight options
- **CloudWatch Logging**: Verifies log group creation and access logging setup
- **IAM Roles**: Tests CloudWatch role creation for API Gateway
- **Cleanup Policies**: Validates resource removal policies

**Key Validations:**
- API Gateway endpoint configuration
- Custom access log format with all required fields
- Log retention policies
- CloudWatch role permissions

### 2. BaseCrudApi Infrastructure Tests (`base-crud.test.ts`)

Tests the complete CRUD infrastructure setup:

- **DynamoDB Configuration**: Table creation with correct keys and GSIs
- **Lambda Function Setup**: Function configuration with environment variables
- **IAM Permissions**: Comprehensive permission validation
- **Resource Dependencies**: Proper resource dependency chains
- **CloudFormation Outputs**: Metadata and endpoint outputs

**Key Validations:**
- Composite key setup for parent-child resources
- ByUserId GSI creation for user-owned resources
- Lambda environment variable configuration
- DynamoDB and IoT permissions
- Table naming conventions

### 3. VTL Mapping Templates Tests (`vtl-mapping-templates.test.ts`)

Validates Apache VTL template generation and structure:

- **Request Template Structure**: Ensures correct payload transformation
- **Parameter Extraction**: Validates parameter mapping from API Gateway
- **User Identity Handling**: Tests Cognito and custom user ID extraction
- **Security Integration**: Validates security configuration in templates
- **Error Response Mapping**: Tests error handling and status code mapping

**Key Validations:**
- Complete parameter structure in VTL templates
- Proper user ID extraction methods
- Parent resource parameter handling
- S3 fields configuration
- Additional parameters integration

### 4. API Gateway Methods Tests (`api-gateway-methods.test.ts`)

Tests API Gateway method configuration:

- **Authorization Setup**: IAM authorization configuration
- **Request Validation**: Request validator and model binding
- **Response Configuration**: Response models and status codes
- **Method Parameters**: Path, query, and header parameter handling
- **CORS Headers**: Response header configuration

**Key Validations:**
- Proper HTTP method creation (POST, GET, PUT, DELETE)
- Request/response model validation
- Parameter requirement configuration
- Status code mapping for different operations
- Non-proxy Lambda integration setup

### 5. Lambda Payload Transformation Tests (`lambda-payload-transformation.test.ts`)

Validates the exact payload structure sent to Lambda functions:

- **Create Payloads**: Tests POST request payload transformation
- **Read Payloads**: Validates GET request parameter extraction
- **Update Payloads**: Tests PUT request body and parameter handling
- **Delete Payloads**: Validates DELETE request transformation
- **List Payloads**: Tests list operation parameter handling

**Key Validations:**
- Complete parameter structure for each operation
- Security configuration inclusion
- S3 fields handling
- Parent resource parameter mapping
- Additional parameter integration

### 6. End-to-End Integration Tests (`end-to-end-integration.test.ts`)

Tests complete integration flows and complex scenarios:

- **Complete CRUD Workflows**: Full create-read-update-delete-list flows
- **Multi-Environment Setup**: Different environment configurations
- **Team-Based Access Control**: Team table integration
- **S3 Large Fields**: Large field storage integration
- **Pivot Tables**: Complex relationship handling
- **Performance Configuration**: Production-optimized settings

**Key Validations:**
- Resource count and type validation
- Multi-resource API sharing
- Complex security configurations
- Error handling end-to-end
- Performance and scaling settings

### 7. Configuration Validation Tests (`configuration-validation.test.ts`)

Tests configuration edge cases and validation:

- **Operation Configuration**: Selective operation enabling
- **Field Name Customization**: Custom field name handling
- **Resource Path Validation**: Complex path handling
- **Security Configuration**: Per-operation security settings
- **Model Configuration**: Input/output model validation
- **Environment Settings**: Multi-environment configuration

**Key Validations:**
- Minimal configuration requirements
- Default value handling
- External resource integration
- Configuration inheritance
- Edge case scenarios

## Test Utilities

### Setup File (`setup.ts`)

The setup file provides:

- **Global Configuration**: AWS region and account setup
- **Test Utilities**: Helper functions for common operations
- **Custom Matchers**: Jest matchers for infrastructure testing
- **Mock Configuration**: Console output suppression

### Custom Jest Matchers

- `toHaveValidVTLTemplate()`: Validates VTL template structure
- `toHaveCorrectIAMPermissions(actions, resources?)`: Validates IAM policy statements
- `toHaveProperErrorHandling()`: Ensures proper error response configuration

### CDK Test Utilities

- `extractLogicalIds()`: Extract CloudFormation logical IDs
- `countResources()`: Count resources of specific types
- `getResourceProperties()`: Get properties by logical ID
- `validateResourceDependencies()`: Check resource dependencies

## Best Practices

### Writing Infrastructure Tests

1. **Focus on Business Logic**: Test actual business requirements, not implementation details
2. **Validate Resource Properties**: Check actual CloudFormation resource properties
3. **Test Integration Points**: Validate how resources work together
4. **Use Descriptive Names**: Make test names clearly describe what's being validated
5. **Test Edge Cases**: Include error conditions and edge cases

### Test Organization

1. **Group Related Tests**: Use describe blocks to group related functionality
2. **Clear Setup/Teardown**: Use beforeEach/afterEach for consistent test state
3. **Independent Tests**: Each test should be independent and not rely on others
4. **Meaningful Assertions**: Each assertion should validate a specific requirement

### Example Test Pattern

```typescript
describe('Feature Group', () => {
  let stack: Stack;
  let template: Template;

  beforeEach(() => {
    stack = new Stack();
    // Setup common resources
  });

  test('should validate specific business requirement', () => {
    // Given - Setup test scenario
    const construct = new MyConstruct(stack, 'Test', {
      // Test configuration
    });

    // When - Generate CloudFormation template
    template = Template.fromStack(stack);

    // Then - Validate business requirements
    template.hasResourceProperties('AWS::Service::Resource', {
      // Expected properties
    });
  });
});
```

## Coverage Expectations

The infrastructure tests aim for:

- **Resource Coverage**: All AWS resources created by constructs
- **Configuration Coverage**: All configuration options and combinations
- **Integration Coverage**: All integration points between resources
- **Error Coverage**: Error handling and edge cases
- **Security Coverage**: All IAM permissions and security configurations

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

- **Fast Execution**: Tests complete in under 30 seconds
- **No External Dependencies**: All tests use CDK synthesis, no real AWS resources
- **Deterministic Results**: Tests produce consistent results across environments
- **Comprehensive Validation**: Catch configuration errors before deployment

## Adding New Tests

When adding new features to the constructs:

1. **Add Feature Tests**: Create tests for new functionality
2. **Update Integration Tests**: Ensure end-to-end flows still work
3. **Add Configuration Tests**: Test new configuration options
4. **Update Documentation**: Keep this README updated

### Test File Naming

- `*.test.ts`: Infrastructure tests
- Use descriptive names that match the feature being tested
- Group related tests in the same file

### Test Structure Guidelines

- Start with simple cases, then add complexity
- Test both positive and negative scenarios
- Include realistic configuration examples
- Validate all resource properties that matter for business logic

## Troubleshooting

### Common Issues

1. **Template Assertion Failures**: Check CloudFormation template structure
2. **Resource Count Mismatches**: Verify all expected resources are created
3. **Property Validation Errors**: Ensure property names and values match exactly
4. **Timeout Issues**: Check for infinite loops in construct logic

### Debugging Tips

1. **Use `template.toJSON()`**: Inspect the full CloudFormation template
2. **Check Resource Logical IDs**: Use `template.findResources()` to see all resources
3. **Validate Property Structure**: Use `JSON.stringify()` to inspect complex objects
4. **Test Incrementally**: Start with simple configurations and add complexity

## Contributing

When contributing to the test suite:

1. **Follow Existing Patterns**: Use the same structure as existing tests
2. **Add Comprehensive Coverage**: Don't just test the happy path
3. **Update Documentation**: Keep this README current
4. **Run All Tests**: Ensure your changes don't break existing functionality

The infrastructure test suite is a critical part of ensuring the reliability and correctness of the AWS CRUD API construct. These tests catch configuration errors early and ensure that the generated infrastructure meets business requirements.
