// Setup global test environment
beforeAll(() => {
  // Configure AWS SDK for testing
  process.env.AWS_REGION = 'us-east-1';
  process.env.AWS_ACCOUNT_ID = '123456789012';
  
  // Disable AWS SDK retries for faster tests
  process.env.AWS_MAX_ATTEMPTS = '1';
  
  // Set CDK context for consistent testing
  process.env.CDK_DEFAULT_REGION = 'us-east-1';
  process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
});

afterAll(() => {
  // Clean up any global resources if needed
});

// Global test configuration
jest.setTimeout(30000);

// Mock console.warn and console.error to reduce noise during tests
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  // Suppress CDK warnings and errors in tests unless explicitly needed
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.warn = originalWarn;
  console.error = originalError;
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Helper functions for infrastructure tests
export const createTestStackName = (testName: string): string => {
  return `test-${testName.replace(/\s+/g, '-').toLowerCase()}`;
};

export const getTestAccountId = (): string => {
  return process.env.AWS_ACCOUNT_ID || '123456789012';
};

export const getTestRegion = (): string => {
  return process.env.AWS_REGION || 'us-east-1';
};

// CDK Test utilities
export const cdkTestUtils = {
  /**
   * Helper to extract logical IDs from CloudFormation template
   */
  extractLogicalIds: (template: any, resourceType: string): string[] => {
    const resources = template.findResources(resourceType);
    return Object.keys(resources);
  },

  /**
   * Helper to count resources of a specific type
   */
  countResources: (template: any, resourceType: string): number => {
    const resources = template.findResources(resourceType);
    return Object.keys(resources).length;
  },

  /**
   * Helper to find resource properties by logical ID
   */
  getResourceProperties: (template: any, resourceType: string, logicalId: string): any => {
    const resources = template.findResources(resourceType);
    return resources[logicalId]?.Properties;
  },

  /**
   * Helper to validate resource dependencies
   */
  validateResourceDependencies: (template: any, dependentResource: string, dependency: string): boolean => {
    const resources = template.template.Resources;
    const dependent = resources[dependentResource];
    
    if (!dependent) return false;
    
    // Check direct dependencies
    if (dependent.DependsOn) {
      const dependencies = Array.isArray(dependent.DependsOn) ? dependent.DependsOn : [dependent.DependsOn];
      return dependencies.includes(dependency);
    }
    
    // Check implicit dependencies through Ref or GetAtt
    const propertiesStr = JSON.stringify(dependent.Properties || {});
    return propertiesStr.includes(dependency);
  }
};

// Infrastructure test matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidVTLTemplate(): R;
      toHaveCorrectIAMPermissions(): R;
      toHaveProperErrorHandling(): R;
    }
  }
}

// Custom Jest matchers for infrastructure testing
expect.extend({
  toHaveValidVTLTemplate(received: any) {
    const vtlTemplate = received;
    
    // Check for required VTL elements
    const hasParams = vtlTemplate.includes('"Params"');
    const hasOperationName = vtlTemplate.includes('"OperationName"');
    const hasUserId = vtlTemplate.includes('$context.identity') || vtlTemplate.includes('$input.params');
    
    const pass = hasParams && hasOperationName && hasUserId;
    
    if (pass) {
      return {
        message: () => `Expected VTL template not to be valid`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected VTL template to be valid but missing required elements: ${!hasParams ? 'Params ' : ''}${!hasOperationName ? 'OperationName ' : ''}${!hasUserId ? 'UserId ' : ''}`,
        pass: false,
      };
    }
  },

  toHaveCorrectIAMPermissions(received: any, expectedActions: string[], expectedResources?: string[]) {
    const policy = received;
    
    if (!policy.PolicyDocument || !policy.PolicyDocument.Statement) {
      return {
        message: () => `Expected policy to have PolicyDocument with Statement`,
        pass: false,
      };
    }
    
    const statements = Array.isArray(policy.PolicyDocument.Statement) 
      ? policy.PolicyDocument.Statement 
      : [policy.PolicyDocument.Statement];
    
    const allActions = statements.flatMap((stmt: any) => 
      Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action]
    );
    
    const hasAllActions = expectedActions.every(action => allActions.includes(action));
    
    if (hasAllActions) {
      return {
        message: () => `Expected policy not to have actions: ${expectedActions.join(', ')}`,
        pass: true,
      };
    } else {
      const missingActions = expectedActions.filter(action => !allActions.includes(action));
      return {
        message: () => `Expected policy to have actions: ${missingActions.join(', ')}`,
        pass: false,
      };
    }
  },

  toHaveProperErrorHandling(received: any) {
    const method = received;
    
    if (!method.Integration || !method.Integration.IntegrationResponses) {
      return {
        message: () => `Expected method to have Integration with IntegrationResponses`,
        pass: false,
      };
    }
    
    const responses = method.Integration.IntegrationResponses;
    const statusCodes = responses.map((r: any) => r.StatusCode);
    
    const requiredErrorCodes = ['400', '403', '500'];
    const hasAllErrorCodes = requiredErrorCodes.every(code => statusCodes.includes(code));
    
    if (hasAllErrorCodes) {
      return {
        message: () => `Expected method not to have proper error handling`,
        pass: true,
      };
    } else {
      const missingCodes = requiredErrorCodes.filter(code => !statusCodes.includes(code));
      return {
        message: () => `Expected method to handle error codes: ${missingCodes.join(', ')}`,
        pass: false,
      };
    }
  }
});

// Export test utilities
export { cdkTestUtils as testUtils };
