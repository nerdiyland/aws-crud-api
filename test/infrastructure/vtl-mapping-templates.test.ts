import { Template, Match } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { RestApi, Model, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import { BaseCrudApi } from '../../lib/base-crud';

describe('VTL Mapping Templates Infrastructure Tests', () => {
  let stack: Stack;
  let template: Template;
  let restApi: RestApi;

  beforeEach(() => {
    stack = new Stack();
    restApi = new RestApi(stack, 'TestApi', {
      restApiName: 'TestAPI'
    });
  });

  describe('CREATE Operation VTL Templates', () => {
    test('should configure correct request template for create operation', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
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

      // Then - Verify the VTL request template structure
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
        Integration: {
          Type: 'AWS',
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp('.*Params.*Data.*OperationName.*createItem.*')
          }
        }
      });
    });

    test('should include all required parameters in create request template', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'production',
        Api: restApi,
        ResourcePath: 'tasks',
        EntitySchema: 'Task',
        IdFieldName: 'TaskId',
        OwnerFieldName: 'OwnerId',
        S3Fields: { 'description': { Prefix: 'task-descriptions/' } },
        Operations: {
          Create: { 
            OperationName: 'createTask',
            SuccessEvent: 'task.created'
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      const expectedTemplateElements = [
        'OperationName.*createItem',
        'EntitySchema.*Task',
        'IdFieldName.*TaskId',
        'OwnerFieldName.*OwnerId',
        'S3Fields',
        'SuccessEvent.*task.created',
        'Data.*\\$input\\.json\\(\'\\$\'\\)'
      ];

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              expectedTemplateElements.join('.*')
            )
          }
        }
      });
    });

    test('should handle parent resource parameters in create template', () => {
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
          RequestParameters: {
            'integration.request.path.projectId': 'method.request.path.projectId'
          },
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp('.*ParentId.*\\$input\\.params\\(\'projectId\'\\).*')
          }
        }
      });
    });
  });

  describe('READ Operation VTL Templates', () => {
    test('should configure correct request template for get by id operation', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        IdFieldName: 'TaskId',
        Operations: {
          Read: { 
            OperationName: 'getTask'
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        Integration: {
          RequestParameters: {
            'integration.request.path.id': 'method.request.path.id'
          },
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp('.*Id.*\\$input\\.params\\(\'id\'\\).*OperationName.*getItemById.*')
          }
        }
      });
    });

    test('should include security parameters in read template', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Read: { 
            OperationName: 'getTask',
            Security: {
              Owner: { Fields: ['title', 'description'] }
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
            'application/json': Match.stringLikeRegexp('.*Security.*Owner.*Fields.*')
          }
        }
      });
    });
  });

  describe('UPDATE Operation VTL Templates', () => {
    test('should configure correct request template for update operation', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Update: { 
            OperationName: 'updateTask'
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'PUT',
        Integration: {
          RequestParameters: {
            'integration.request.path.id': 'method.request.path.id'
          },
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp('.*OperationName.*updateItem.*Data.*\\$input\\.json\\(\'\\$\'\\).*')
          }
        }
      });
    });
  });

  describe('DELETE Operation VTL Templates', () => {
    test('should configure correct request template for delete operation', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Delete: { 
            OperationName: 'deleteTask'
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'DELETE',
        Integration: {
          RequestTemplates: {
            'text/plain': Match.stringLikeRegexp('.*OperationName.*deleteItem.*'),
            'application/json': Match.stringLikeRegexp('.*OperationName.*deleteItem.*')
          }
        }
      });
    });
  });

  describe('LIST Operation VTL Templates', () => {
    test('should configure correct request template for list operation', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          List: { 
            OperationName: 'listTasks'
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp('.*OperationName.*listItems.*ListType.*global.*')
          }
        }
      });
    });

    test('should configure owned list operation with correct template', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          ListOwned: { 
            OperationName: 'listMyTasks',
            IndexName: 'ByUserId'
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp('.*ListType.*owned.*IndexName.*ByUserId.*')
          }
        }
      });
    });

    test('should handle pivot configuration in list template', () => {
      // Given
      const pivotTable = new (require('aws-cdk-lib/aws-dynamodb').Table)(stack, 'PivotTable', {
        partitionKey: { name: 'id', type: require('aws-cdk-lib/aws-dynamodb').AttributeType.STRING }
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
          List: { 
            OperationName: 'listTasks'
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp('.*Pivot.*SourceField.*teamId.*PivotFields.*memberId.*role.*')
          }
        }
      });
    });
  });

  describe('Response Template Validation', () => {
    test('should configure correct integration responses for all methods', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' },
          Read: { OperationName: 'getTask' },
          Update: { OperationName: 'updateTask' },
          Delete: { OperationName: 'deleteTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Create method should have 201 response
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
        Integration: {
          IntegrationResponses: Match.arrayWith([
            {
              StatusCode: '201',
              ResponseParameters: {
                'method.response.header.access-control-allow-origin': "'*'",
                'method.response.header.access-control-allow-headers': "'*'",
                'method.response.header.access-control-allow-methods': "'*'",
                'method.response.header.access-control-allow-credentials': "'true'"
              }
            }
          ])
        }
      });

      // Then - Read/Update methods should have 200 response
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        Integration: {
          IntegrationResponses: Match.arrayWith([
            {
              StatusCode: '200'
            }
          ])
        }
      });

      // Then - Delete method should have 204 response
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'DELETE',
        Integration: {
          IntegrationResponses: Match.arrayWith([
            {
              StatusCode: '204'
            }
          ])
        }
      });
    });

    test('should configure error response mappings with correct selection patterns', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Read: { OperationName: 'getTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          IntegrationResponses: Match.arrayWith([
            {
              StatusCode: '404',
              SelectionPattern: 'Item not found'
            },
            {
              StatusCode: '400',
              SelectionPattern: 'Bad request'
            },
            {
              StatusCode: '403',
              SelectionPattern: 'Unauthorized'
            },
            {
              StatusCode: '500',
              SelectionPattern: '(Internal server error|Error:)'
            }
          ])
        }
      });
    });
  });

  describe('User Identity Extraction', () => {
    test('should extract user identity from Cognito by default', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
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
            'application/json': Match.stringLikeRegexp('.*UserId.*\\$context\\.identity\\.cognitoIdentityId.*')
          }
        }
      });
    });

    test('should use custom user id source when specified', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        UserId: '$input.params(\'custom-user-header\')',
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
            'application/json': Match.stringLikeRegexp('.*UserId.*\\$input\\.params\\(\'custom-user-header\'\\).*')
          }
        }
      });
    });

    test('should include X-AFTERSIGNALS-USER-ID header extraction', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
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
            'application/json': Match.stringLikeRegexp('.*InputUserId.*\\$input\\.params\\(\'X-AFTERSIGNALS-USER-ID\'\\).*')
          }
        }
      });
    });
  });

  describe('Additional Parameters Configuration', () => {
    test('should include additional parameters in request template', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        AdditionalParams: {
          'TenantId': '$input.params(\'tenant-id\')',
          'ApiVersion': '$input.params(\'version\')'
        },
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
            'application/json': Match.stringLikeRegexp('.*TenantId.*\\$input\\.params\\(\'tenant-id\'\\).*ApiVersion.*\\$input\\.params\\(\'version\'\\).*')
          }
        }
      });
    });
  });
});
