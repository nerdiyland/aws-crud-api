import { Template, Match } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { RestApi, Model, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import { BaseCrudApi } from '../../lib/base-crud';
import { BaseApi } from '../../lib/base-api';

describe('Configuration Validation Tests', () => {
  let stack: Stack;
  let template: Template;
  let restApi: RestApi;

  beforeEach(() => {
    stack = new Stack();
    restApi = new RestApi(stack, 'TestApi', {
      restApiName: 'TestAPI'
    });
  });

  describe('Operation Configuration Validation', () => {
    test('should configure only specified operations', () => {
      // Given - Only Create and Read operations
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' },
          Read: { OperationName: 'getTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Only POST and GET methods should exist
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST'
      });
      
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET'
      });

      // Should not have PUT or DELETE methods
      const methods = template.findResources('AWS::ApiGateway::Method');
      const methodsArray = Object.values(methods);
      const hasPutMethod = methodsArray.some((method: any) => method.Properties?.HttpMethod === 'PUT');
      const hasDeleteMethod = methodsArray.some((method: any) => method.Properties?.HttpMethod === 'DELETE');
      
      expect(hasPutMethod).toBe(false);
      expect(hasDeleteMethod).toBe(false);
    });

    test('should validate that at least one operation is defined', () => {
      // Given/When/Then - Should not throw error with at least one operation
      expect(() => {
        new BaseCrudApi(stack, 'TestCrud', {
          EnvironmentName: 'test',
          Api: restApi,
          ResourcePath: 'tasks',
          Operations: {
            Create: { OperationName: 'createTask' }
          }
        });
      }).not.toThrow();
    });

    test('should configure different operations for same resource type', () => {
      // Given - ListOwned instead of List
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

      // Then - Should create method for ListOwned operation
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        OperationName: 'listMyTasks'
      });

      // Should configure GSI permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: ['dynamodb:Query'],
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    { 'Fn::GetAtt': [Match.anyValue(), 'Arn'] },
                    '/index/ByUserId'
                  ]
                ]
              }
            }
          ])
        }
      });
    });
  });

  describe('Field Name Configuration Validation', () => {
    test('should use default field names when not specified', () => {
      // Given - No custom field names
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

      // Then - Should use defaults: Id, UserId
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [
          {
            AttributeName: 'Id',
            KeyType: 'HASH'
          }
        ]
      });

      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            ID_PARAM_NAME: 'Id',
            PARENT_PARAM_NAME: 'no'
          }
        }
      });
    });

    test('should use custom field names when specified', () => {
      // Given - Custom field names
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        IdFieldName: 'TaskId',
        OwnerFieldName: 'CreatedBy',
        IdResourceName: 'taskId',
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should use custom names
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [
          {
            AttributeName: 'TaskId',
            KeyType: 'HASH'
          }
        ]
      });

      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            ID_PARAM_NAME: 'taskId'
          }
        }
      });

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"IdFieldName"\\s*:.*TaskId.*"OwnerFieldName"\\s*:.*CreatedBy.*'
            )
          }
        }
      });
    });

    test('should handle parent-child field name configuration', () => {
      // Given - Parent-child configuration
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'comments',
        ParentResourceName: 'task',
        ParentFieldName: 'TaskId',
        IdFieldName: 'CommentId',
        Operations: {
          Create: { OperationName: 'createComment' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should configure composite key
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [
          {
            AttributeName: 'TaskId',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'CommentId',
            KeyType: 'RANGE'
          }
        ]
      });

      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            PARENT_PARAM_NAME: 'TaskId'
          }
        }
      });
    });
  });

  describe('Resource Path Configuration Validation', () => {
    test('should handle simple resource paths', () => {
      // Given - Simple path
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

      // Then - Should create resource with correct path
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'tasks'
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: {
          'Fn::Join': ['-', [{ Ref: Match.anyValue() }, 'crudStorage', 'tasks']]
        }
      });
    });

    test('should handle complex nested resource paths', () => {
      // Given - Nested path with parameters
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'projects/{projectId}/tasks/{taskId}/comments',
        Operations: {
          Create: { OperationName: 'createComment' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should normalize path for table name
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: {
          'Fn::Join': ['-', [{ Ref: Match.anyValue() }, 'crudStorage', 'projects/projectId/tasks/taskId/comments']]
        }
      });
    });

    test('should handle resource paths with special characters', () => {
      // Given - Path with special characters
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'api/v1/user-tasks',
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should handle path correctly
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: {
          'Fn::Join': ['-', [{ Ref: Match.anyValue() }, 'crudStorage', 'api/v1/user-tasks']]
        }
      });
    });
  });

  describe('Security Configuration Validation', () => {
    test('should configure security settings per operation', () => {
      // Given - Different security for different operations
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: {
            OperationName: 'createTask',
            Security: { Owner: { Fields: ['*'] } }
          },
          Read: {
            OperationName: 'getTask',
            Security: { 
              Owner: { Fields: ['*'] },
              Public: { Fields: ['title', 'status'] }
            }
          },
          List: {
            OperationName: 'listTasks',
            Security: { Public: { Fields: ['title'] } }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Each method should have its own security config
      const methods = template.findResources('AWS::ApiGateway::Method');
      const methodsWithTemplates = Object.values(methods).filter((method: any) => 
        method.Properties?.Integration?.RequestTemplates
      );
      
      expect(methodsWithTemplates.length).toBeGreaterThan(0);
    });

    test('should handle team-based security configuration', () => {
      // Given - Team security settings
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: {
            OperationName: 'createTask',
            Security: { 
              Team: { Fields: ['title', 'description'] },
              Owner: { Fields: ['*'] }
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should include team security in VTL
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"Security"\\s*:.*Team.*Fields.*title.*description.*Owner.*Fields.*'
            )
          }
        }
      });
    });
  });

  describe('Model Configuration Validation', () => {
    test('should work without input or response models', () => {
      // Given - No models specified
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' },
          Read: { OperationName: 'getTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should still create methods without model validation
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST'
      });
      
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET'
      });
    });

    test('should validate input models when provided', () => {
      // Given - Input model specified
      const inputModel = new Model(stack, 'InputModel', {
        restApi: restApi,
        modelName: 'TaskInput',
        schema: {
          type: JsonSchemaType.OBJECT,
          properties: {
            title: { type: JsonSchemaType.STRING },
            description: { type: JsonSchemaType.STRING }
          },
          required: ['title']
        }
      });

      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: {
            OperationName: 'createTask',
            InputModel: inputModel
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should configure request validation
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        RequestModels: {
          'application/json': { Ref: Match.anyValue() }
        }
      });
    });

    test('should validate response models when provided', () => {
      // Given - Response model specified
      const responseModel = new Model(stack, 'ResponseModel', {
        restApi: restApi,
        modelName: 'TaskResponse',
        schema: {
          type: JsonSchemaType.OBJECT,
          properties: {
            id: { type: JsonSchemaType.STRING },
            title: { type: JsonSchemaType.STRING }
          }
        }
      });

      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: {
            OperationName: 'createTask',
            Response: { Model: responseModel }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should configure response validation
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        MethodResponses: Match.arrayWith([
          {
            StatusCode: '201',
            ResponseModels: {
              'application/json': { Ref: Match.anyValue() }
            }
          }
        ])
      });
    });
  });

  describe('Environment Configuration Validation', () => {
    test('should configure different environments correctly', () => {
      // Given - Different environment configurations
      const devCrud = new BaseCrudApi(stack, 'DevCrud', {
        EnvironmentName: 'development',
        Api: restApi,
        ResourcePath: 'dev-tasks',
        BackendMemory: 512,
        BackendTimeout: { seconds: 5 } as any,
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      const prodCrud = new BaseCrudApi(stack, 'ProdCrud', {
        EnvironmentName: 'production',
        Api: restApi,
        ResourcePath: 'prod-tasks',
        BackendMemory: 3008,
        BackendTimeout: { seconds: 15 } as any,
        IotEndpointAddress: 'iot.prod.amazonaws.com',
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should have different configurations for each environment
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const functionsArray = Object.values(lambdaFunctions);
      
      expect(functionsArray).toHaveLength(2);
      
      // One should be dev config, one should be prod config
      const memoryConfigs = functionsArray.map((fn: any) => fn.Properties?.MemorySize);
      expect(memoryConfigs).toContain(512);
      expect(memoryConfigs).toContain(3008);
    });

    test('should handle missing environment-specific configurations gracefully', () => {
      // Given - Minimal environment configuration
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

      // Then - Should use default values
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 1024,
        Timeout: 10,
        Environment: {
          Variables: {
            ENVIRONMENT_NAME: 'test',
            IOT_ENDPOINT_ADDRESS: 'none'
          }
        }
      });
    });
  });

  describe('Resource Integration Validation', () => {
    test('should handle external table configuration', () => {
      // Given - External table provided
      const { Table } = require('aws-cdk-lib/aws-dynamodb');
      const { AttributeType } = require('aws-cdk-lib/aws-dynamodb');
      
      const externalTable = new Table(stack, 'ExternalTable', {
        partitionKey: { name: 'CustomId', type: AttributeType.STRING }
      });

      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Table: externalTable,
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should not create new table, should use external
      const tables = template.findResources('AWS::DynamoDB::Table');
      expect(Object.keys(tables)).toHaveLength(1); // Only the external table

      // Should not add GSI to external table
      const tableProperties = Object.values(tables)[0] as any;
      expect(tableProperties.Properties?.GlobalSecondaryIndexes).toBeUndefined();
    });

    test('should handle external Lambda function configuration', () => {
      // Given - External Lambda function provided
      const { Function } = require('aws-cdk-lib/aws-lambda');
      const { Runtime } = require('aws-cdk-lib/aws-lambda');
      const { Code } = require('aws-cdk-lib/aws-lambda');
      
      const externalFunction = new Function(stack, 'ExternalFunction', {
        runtime: Runtime.NODEJS_18_X,
        handler: 'custom.handler',
        code: Code.fromInline('exports.handler = async () => ({});')
      });

      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        BackendFunction: externalFunction,
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should not create new Lambda, should use external
      const functions = template.findResources('AWS::Lambda::Function');
      expect(Object.keys(functions)).toHaveLength(1); // Only the external function

      // Should not modify external function environment
      const functionProperties = Object.values(functions)[0] as any;
      expect(functionProperties.Properties?.Handler).toBe('custom.handler');
    });
  });

  describe('BaseApi Configuration Validation', () => {
    test('should configure BaseApi with correct settings', () => {
      // Given
      const baseApi = new BaseApi(stack, 'TestBaseApi', {
        ApiName: 'TestConfigAPI'
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should create API with correct configuration
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'TestConfigAPI'
      });

      // Should configure logging
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 7
      });

      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        MethodSettings: [
          {
            HttpMethod: '*',
            LoggingLevel: 'INFO',
            ResourcePath: '/*'
          }
        ]
      });
    });
  });
});
