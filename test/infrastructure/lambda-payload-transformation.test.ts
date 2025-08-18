import { Template, Match } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { BaseCrudApi } from '../../lib/base-crud';

describe('Lambda Payload Transformation Tests', () => {
  let stack: Stack;
  let template: Template;
  let restApi: RestApi;

  beforeEach(() => {
    stack = new Stack();
    restApi = new RestApi(stack, 'TestApi', {
      restApiName: 'TestAPI'
    });
  });

  describe('Create Operation Payload Structure', () => {
    test('should structure payload correctly for simple create operation', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'production',
        Api: restApi,
        ResourcePath: 'tasks',
        EntitySchema: 'Task',
        IdFieldName: 'TaskId',
        OwnerFieldName: 'UserId',
        Operations: {
          Create: { 
            OperationName: 'createTask',
            SuccessEvent: 'task.created'
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Verify the payload structure contains all required elements
      const expectedPayloadElements = [
        // Params object structure
        '"Params"\\s*:\\s*{',
        '"NoScaffolding"\\s*:',
        '"InputUserId"\\s*:.*\\$input\\.params\\(\'X-AFTERSIGNALS-USER-ID\'\\)',
        '"UserId"\\s*:.*\\$context\\.identity\\.cognitoIdentityId',
        '"OperationName"\\s*:.*createItem',
        '"EntitySchema"\\s*:.*Task',
        '"IdFieldName"\\s*:.*TaskId',
        '"OwnerFieldName"\\s*:.*UserId',
        '"SuccessEvent"\\s*:.*task\\.created',
        '"ParentId"\\s*:.*none',
        // Data object
        '"Data"\\s*:.*\\$input\\.json\\(\'\\$\'\\)'
      ];

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              expectedPayloadElements.join('.*')
            )
          }
        }
      });
    });

    test('should include S3 fields configuration in create payload', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'documents',
        S3Fields: {
          'content': { 
            Prefix: 'documents/content/',
            DataFormat: 'raw' as any,
            ContentType: 'text/plain'
          },
          'metadata': {
            Prefix: 'documents/meta/',
            DataFormat: 'json' as any
          }
        },
        Operations: {
          Create: { OperationName: 'createDocument' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"S3Fields"\\s*:.*content.*documents/content/.*metadata.*documents/meta/.*'
            )
          }
        }
      });
    });

    test('should handle parent resource ID in create payload', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'projects/{projectId}/tasks',
        ParentResourceName: 'project',
        ParentFieldName: 'ProjectId',
        Operations: {
          Create: {
            OperationName: 'createTask',
            ParentId: {
              Param: 'projectId',
              Source: 'path' as any
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"ParentFieldName"\\s*:.*ProjectId.*"ParentId"\\s*:.*\\$input\\.params\\(\'projectId\'\\).*'
            )
          }
        }
      });
    });

    test('should include output fields filtering in create payload', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: {
            OperationName: 'createTask',
            Response: {
              Fields: ['id', 'title', 'status', 'createdAt']
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"OutputFields"\\s*:\\s*\\[.*id.*title.*status.*createdAt.*\\].*'
            )
          }
        }
      });
    });

    test('should include security configuration in create payload', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: {
            OperationName: 'createTask',
            Security: {
              Owner: { Fields: ['title', 'description'] },
              Public: { Fields: ['title'] }
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"Security"\\s*:.*Owner.*Fields.*title.*description.*Public.*Fields.*title.*'
            )
          }
        }
      });
    });
  });

  describe('Read Operation Payload Structure', () => {
    test('should structure payload correctly for read operation', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        IdFieldName: 'TaskId',
        OwnerFieldName: 'UserId',
        S3Fields: { 'description': { Prefix: 'task-desc/' } },
        Operations: {
          Read: {
            OperationName: 'getTask',
            Security: {
              Owner: { Fields: ['title', 'description', 'status'] }
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      const expectedPayloadElements = [
        '"Params"\\s*:\\s*{',
        '"Id"\\s*:.*\\$input\\.params\\(\'id\'\\)',
        '"InputUserId"\\s*:.*\\$input\\.params\\(\'X-AFTERSIGNALS-USER-ID\'\\)',
        '"UserId"\\s*:.*\\$context\\.identity\\.cognitoIdentityId',
        '"OperationName"\\s*:.*getItemById',
        '"IdFieldName"\\s*:.*TaskId',
        '"OwnerFieldName"\\s*:.*UserId',
        '"S3Fields"\\s*:.*description.*task-desc/',
        '"Security"\\s*:.*Owner.*Fields.*title.*description.*status',
        '"ParentId"\\s*:.*none'
      ];

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              expectedPayloadElements.join('.*')
            )
          }
        }
      });
    });

    test('should handle parent ID parameter in read payload', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Read: {
            OperationName: 'getTask',
            ParentId: {
              Param: 'projectId',
              Source: 'querystring' as any
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"ParentId"\\s*:.*\\$input\\.params\\(\'projectId\'\\).*'
            )
          }
        }
      });
    });
  });

  describe('Update Operation Payload Structure', () => {
    test('should structure payload correctly for update operation', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        IdFieldName: 'TaskId',
        ParentFieldName: 'ProjectId',
        S3Fields: { 'notes': { Prefix: 'task-notes/' } },
        Operations: {
          Update: {
            OperationName: 'updateTask',
            Security: {
              Owner: { Fields: ['*'] }
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      const expectedPayloadElements = [
        '"Params"\\s*:\\s*{',
        '"Id"\\s*:.*\\$input\\.params\\(\'id\'\\)',
        '"InputUserId"\\s*:.*\\$input\\.params\\(\'X-AFTERSIGNALS-USER-ID\'\\)',
        '"UserId"\\s*:.*\\$context\\.identity\\.cognitoIdentityId',
        '"OperationName"\\s*:.*updateItem',
        '"IdFieldName"\\s*:.*TaskId',
        '"ParentFieldName"\\s*:.*ProjectId',
        '"S3Fields"\\s*:.*notes.*task-notes/',
        '"Security"\\s*:.*Owner',
        // Data payload for request body
        '"Data"\\s*:.*\\$input\\.json\\(\'\\$\'\\)'
      ];

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'PUT',
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              expectedPayloadElements.join('.*')
            )
          }
        }
      });
    });
  });

  describe('Delete Operation Payload Structure', () => {
    test('should structure payload correctly for delete operation', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        IdFieldName: 'TaskId',
        S3Fields: { 'attachments': { Prefix: 'task-files/' } },
        Operations: {
          Delete: {
            OperationName: 'deleteTask',
            Security: {
              Owner: { Fields: ['*'] }
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      const expectedPayloadElements = [
        '"Params"\\s*:\\s*{',
        '"Id"\\s*:.*\\$input\\.params\\(\'id\'\\)',
        '"InputUserId"\\s*:.*\\$input\\.params\\(\'X-AFTERSIGNALS-USER-ID\'\\)',
        '"UserId"\\s*:.*\\$context\\.identity\\.cognitoIdentityId',
        '"OperationName"\\s*:.*deleteItem',
        '"IdFieldName"\\s*:.*TaskId',
        '"S3Fields"\\s*:.*attachments.*task-files/',
        '"Security"\\s*:.*Owner'
      ];

      // Both text/plain and application/json templates should have the same structure
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'DELETE',
        Integration: {
          RequestTemplates: {
            'text/plain': Match.stringLikeRegexp(
              expectedPayloadElements.join('.*')
            ),
            'application/json': Match.stringLikeRegexp(
              expectedPayloadElements.join('.*')
            )
          }
        }
      });
    });
  });

  describe('List Operation Payload Structure', () => {
    test('should structure payload correctly for global list operation', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        EntitySchema: 'Task',
        Operations: {
          List: {
            OperationName: 'listTasks',
            Security: {
              Public: { Fields: ['title', 'status'] }
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      const expectedPayloadElements = [
        '"Params"\\s*:\\s*{',
        '"InputUserId"\\s*:.*\\$input\\.params\\(\'X-AFTERSIGNALS-USER-ID\'\\)',
        '"UserId"\\s*:.*\\$context\\.identity\\.cognitoIdentityId',
        '"OperationName"\\s*:.*listItems',
        '"ListType"\\s*:.*global',
        '"EntitySchema"\\s*:.*Task',
        '"Security"\\s*:.*Public.*Fields.*title.*status',
        '"ParentId"\\s*:.*none',
        '"Pivot"\\s*:.*none'
      ];

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              expectedPayloadElements.join('.*')
            )
          }
        }
      });
    });

    test('should structure payload correctly for owned list operation', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          ListOwned: {
            OperationName: 'listMyTasks',
            IndexName: 'ByUserId',
            Security: {
              Owner: { Fields: ['*'] }
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      const expectedPayloadElements = [
        '"OperationName"\\s*:.*listItems',
        '"ListType"\\s*:.*owned',
        '"IndexName"\\s*:.*ByUserId',
        '"Security"\\s*:.*Owner'
      ];

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              expectedPayloadElements.join('.*')
            )
          }
        }
      });
    });

    test('should include pivot configuration in list payload', () => {
      // Given
      const { Table } = require('aws-cdk-lib/aws-dynamodb');
      const { AttributeType } = require('aws-cdk-lib/aws-dynamodb');
      
      const pivotTable = new Table(stack, 'PivotTable', {
        partitionKey: { name: 'id', type: AttributeType.STRING }
      });

      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Pivot: {
          Table: pivotTable,
          SourceField: 'teamId',
          PivotFields: ['memberId', 'role']
        },
        Operations: {
          List: { OperationName: 'listTasks' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"Pivot"\\s*:\\s*{.*"SourceField"\\s*:.*teamId.*"PivotFields"\\s*:.*memberId.*role.*}.*'
            )
          }
        }
      });
    });
  });

  describe('Additional Parameters Payload Integration', () => {
    test('should include additional parameters in all operation payloads', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        AdditionalParams: {
          'TenantId': '$input.params(\'tenant-id\')',
          'RequestSource': '$input.params(\'source\')',
          'ApiVersion': '$input.params(\'version\')'
        },
        Operations: {
          Create: { OperationName: 'createTask' },
          Read: { OperationName: 'getTask' },
          Update: { OperationName: 'updateTask' },
          Delete: { OperationName: 'deleteTask' },
          List: { OperationName: 'listTasks' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - All methods should include the additional parameters
      const expectedAdditionalParams = [
        '"TenantId"\\s*:.*\\$input\\.params\\(\'tenant-id\'\\)',
        '"RequestSource"\\s*:.*\\$input\\.params\\(\'source\'\\)',
        '"ApiVersion"\\s*:.*\\$input\\.params\\(\'version\'\\)'
      ];

      ['POST', 'GET', 'PUT', 'DELETE'].forEach(method => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
          HttpMethod: method,
          Integration: {
            RequestTemplates: {
              [method === 'DELETE' ? 'text/plain' : 'application/json']: Match.stringLikeRegexp(
                expectedAdditionalParams.join('.*')
              )
            }
          }
        });
      });
    });
  });

  describe('Environment and Context Variables', () => {
    test('should correctly extract environment name in all payloads', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'staging',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' },
          List: { OperationName: 'listTasks' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Environment should be passed to Lambda function, not in VTL
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            ENVIRONMENT_NAME: 'staging'
          }
        }
      });
    });

    test('should handle custom user ID extraction', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        UserId: '$input.params(\'X-Custom-User-Id\')',
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"UserId"\\s*:.*\\$input\\.params\\(\'X-Custom-User-Id\'\\).*'
            )
          }
        }
      });
    });

    test('should handle NoScaffolding flag in payload', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        NoScaffolding: true,
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"NoScaffolding"\\s*:\\s*true.*'
            )
          }
        }
      });
    });
  });
});
