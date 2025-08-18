import { Template, Match } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { RestApi, Model, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import { BaseCrudApi } from '../../lib/base-crud';

describe('End-to-End Integration Flow Tests', () => {
  let stack: Stack;
  let template: Template;
  let restApi: RestApi;

  beforeEach(() => {
    stack = new Stack();
    restApi = new RestApi(stack, 'TestApi', {
      restApiName: 'TestAPI'
    });
  });

  describe('Complete CRUD Workflow Integration', () => {
    test('should configure complete CRUD resource with all operations', () => {
      // Given - Complete CRUD setup with input/output models
      const createModel = new Model(stack, 'CreateTaskModel', {
        restApi: restApi,
        modelName: 'CreateTaskRequest',
        schema: {
          type: JsonSchemaType.OBJECT,
          properties: {
            title: { type: JsonSchemaType.STRING },
            description: { type: JsonSchemaType.STRING },
            priority: { type: JsonSchemaType.STRING }
          },
          required: ['title']
        }
      });

      const taskResponseModel = new Model(stack, 'TaskResponseModel', {
        restApi: restApi,
        modelName: 'TaskResponse',
        schema: {
          type: JsonSchemaType.OBJECT,
          properties: {
            id: { type: JsonSchemaType.STRING },
            title: { type: JsonSchemaType.STRING },
            description: { type: JsonSchemaType.STRING },
            priority: { type: JsonSchemaType.STRING },
            createdAt: { type: JsonSchemaType.STRING },
            updatedAt: { type: JsonSchemaType.STRING }
          }
        }
      });

      const listResponseModel = new Model(stack, 'TaskListResponseModel', {
        restApi: restApi,
        modelName: 'TaskListResponse',
        schema: {
          type: JsonSchemaType.OBJECT,
          properties: {
            items: {
              type: JsonSchemaType.ARRAY,
              items: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  id: { type: JsonSchemaType.STRING },
                  title: { type: JsonSchemaType.STRING },
                  description: { type: JsonSchemaType.STRING },
                  priority: { type: JsonSchemaType.STRING },
                  createdAt: { type: JsonSchemaType.STRING },
                  updatedAt: { type: JsonSchemaType.STRING }
                }
              }
            },
            count: { type: JsonSchemaType.NUMBER },
            nextToken: { type: JsonSchemaType.STRING }
          }
        }
      });

      const baseCrud = new BaseCrudApi(stack, 'TasksCrud', {
        EnvironmentName: 'production',
        Api: restApi,
        ResourcePath: 'tasks',
        EntitySchema: 'Task',
        IdFieldName: 'TaskId',
        OwnerFieldName: 'UserId',
        S3Fields: {
          'attachments': { Prefix: 'task-attachments/' }
        },
        Operations: {
          Create: {
            OperationName: 'createTask',
            InputModel: createModel,
            Response: { Model: taskResponseModel },
            SuccessEvent: 'task.created',
            Security: { Owner: { Fields: ['*'] } }
          },
          Read: {
            OperationName: 'getTask',
            Response: { Model: taskResponseModel },
            Security: { 
              Owner: { Fields: ['*'] },
              Public: { Fields: ['title', 'priority'] }
            }
          },
          Update: {
            OperationName: 'updateTask',
            InputModel: createModel,
            Response: { Model: taskResponseModel },
            Security: { Owner: { Fields: ['*'] } }
          },
          Delete: {
            OperationName: 'deleteTask',
            Security: { Owner: { Fields: ['*'] } }
          },
          ListOwned: {
            OperationName: 'listMyTasks',
            IndexName: 'ByUserId',
            Response: { Model: listResponseModel },
            Security: { Owner: { Fields: ['*'] } }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Verify all resources exist
      template.resourceCountIs('AWS::ApiGateway::Resource', 2); // Global + Individual
      template.resourceCountIs('AWS::ApiGateway::Method', 5);   // All CRUD operations
      template.resourceCountIs('AWS::DynamoDB::Table', 1);
      template.resourceCountIs('AWS::Lambda::Function', 1);
      template.resourceCountIs('AWS::IAM::Policy', 1);

      // Verify API Gateway structure
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'tasks'
      });
      
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: '{id}'
      });

      // Verify all HTTP methods are configured
      ['POST', 'GET', 'PUT', 'DELETE'].forEach(method => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
          HttpMethod: method,
          AuthorizationType: 'AWS_IAM'
        });
      });
    });

    test('should create proper resource hierarchy for nested resources', () => {
      // Given - Parent-child resource structure
      const baseCrud = new BaseCrudApi(stack, 'CommentsCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks/{taskId}/comments',
        ParentResourceName: 'task',
        ParentFieldName: 'TaskId',
        IdFieldName: 'CommentId',
        Operations: {
          Create: {
            OperationName: 'createComment',
            ParentId: {
              Param: 'taskId',
              Source: 'path' as any
            }
          },
          Read: {
            OperationName: 'getComment',
            ParentId: {
              Param: 'taskId',
              Source: 'path' as any
            }
          },
          List: {
            OperationName: 'listTaskComments',
            ParentId: {
              Param: 'taskId',
              Source: 'path' as any
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Verify DynamoDB table has composite key
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

      // Verify methods require parent parameter
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        RequestParameters: {
          'method.request.path.taskId': true
        }
      });

      // Verify integration parameters pass parent ID
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestParameters: {
            'integration.request.path.taskId': 'method.request.path.taskId'
          }
        }
      });
    });
  });

  describe('Multi-Environment Configuration Flow', () => {
    test('should configure different settings for different environments', () => {
      // Given - Production environment setup
      const prodCrud = new BaseCrudApi(stack, 'ProdTasksCrud', {
        EnvironmentName: 'production',
        Api: restApi,
        ResourcePath: 'prod-tasks',
        BackendMemory: 2048,
        BackendTimeout: { seconds: 30 } as any,
        IotEndpointAddress: 'iot.production.amazonaws.com',
        Operations: {
          Create: { OperationName: 'createTask' },
          ListOwned: { 
            OperationName: 'listMyTasks',
            IndexName: 'ByUserId'
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Verify production-specific configuration
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 2048,
        Timeout: 30,
        Environment: {
          Variables: {
            ENVIRONMENT_NAME: 'production',
            IOT_ENDPOINT_ADDRESS: 'iot.production.amazonaws.com'
          }
        }
      });

      // Verify IoT permissions for production
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: ['iot:Publish'],
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:aws:iot:',
                    { Ref: 'AWS::Region' },
                    ':',
                    { Ref: 'AWS::AccountId' },
                    ':topic/production/events/*'
                  ]
                ]
              }
            }
          ])
        }
      });
    });
  });

  describe('Team-Based Access Control Integration', () => {
    test('should configure team-based permissions when team tables provided', () => {
      // Given - Team tables setup
      const { Table } = require('aws-cdk-lib/aws-dynamodb');
      const { AttributeType } = require('aws-cdk-lib/aws-dynamodb');
      
      const teamMembershipsTable = new Table(stack, 'TeamMemberships', {
        partitionKey: { name: 'TeamId', type: AttributeType.STRING },
        sortKey: { name: 'MemberId', type: AttributeType.STRING }
      });

      const teamResourcesTable = new Table(stack, 'TeamResources', {
        partitionKey: { name: 'ResourceId', type: AttributeType.STRING }
      });

      const baseCrud = new BaseCrudApi(stack, 'TeamTasksCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'team-tasks',
        TeamMembershipsTable: teamMembershipsTable,
        TeamResourcesTable: teamResourcesTable,
        Operations: {
          Create: {
            OperationName: 'createTeamTask',
            Security: {
              Team: { Fields: ['*'] }
            }
          },
          List: {
            OperationName: 'listTeamTasks',
            Security: {
              Team: { Fields: ['title', 'status'] }
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Verify Lambda has access to team tables
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            TEAM_MEMBERSHIPS_TABLE_NAME: { Ref: Match.anyValue() },
            TEAM_RESOURCES_TABLE_NAME: { Ref: Match.anyValue() }
          }
        }
      });

      // Verify IAM permissions for team tables
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: ['dynamodb:Query', 'dynamodb:BatchGetItem'],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::Join': [
                    '',
                    [
                      { 'Fn::GetAtt': [Match.anyValue(), 'Arn'] },
                      '/index/ByMemberId'
                    ]
                  ]
                },
                { 'Fn::GetAtt': [Match.anyValue(), 'Arn'] }
              ]
            }
          ])
        }
      });

      // Verify VTL templates include team security
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"Security"\\s*:.*Team.*Fields.*'
            )
          }
        }
      });
    });
  });

  describe('S3 Large Fields Integration Flow', () => {
    test('should configure complete S3 integration for large field storage', () => {
      // Given - S3 bucket and large fields configuration
      const { Bucket } = require('aws-cdk-lib/aws-s3');
      
      const bucket = new Bucket(stack, 'DocumentsBucket');

      const baseCrud = new BaseCrudApi(stack, 'DocumentsCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'documents',
        Bucket: bucket,
        S3Fields: {
          'content': {
            Prefix: 'documents/content/',
            DataFormat: 'raw' as any,
            ContentType: 'text/plain'
          },
          'metadata': {
            Prefix: 'documents/meta/',
            DataFormat: 'json' as any,
            ContentType: 'application/json'
          },
          'thumbnail': {
            Prefix: 'documents/thumbs/',
            DataFormat: 'raw' as any,
            ContentType: 'image/jpeg'
          }
        },
        Operations: {
          Create: { OperationName: 'createDocument' },
          Read: { OperationName: 'getDocument' },
          Update: { OperationName: 'updateDocument' },
          Delete: { OperationName: 'deleteDocument' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Verify Lambda has S3 permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
              Effect: 'Allow',
              Resource: [
                { 'Fn::GetAtt': [Match.anyValue(), 'Arn'] },
                {
                  'Fn::Join': [
                    '',
                    [
                      { 'Fn::GetAtt': [Match.anyValue(), 'Arn'] },
                      '/*'
                    ]
                  ]
                }
              ]
            }
          ])
        }
      });

      // Verify Lambda environment includes bucket name
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            ITEMS_BUCKET_NAME: { Ref: Match.anyValue() }
          }
        }
      });

      // Verify S3Fields configuration in VTL templates
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"S3Fields"\\s*:.*content.*documents/content/.*metadata.*documents/meta/.*thumbnail.*documents/thumbs/.*'
            )
          }
        }
      });
    });
  });

  describe('Pivot Table Integration Flow', () => {
    test('should configure complete pivot table integration', () => {
      // Given - Pivot table for team resource management
      const { Table } = require('aws-cdk-lib/aws-dynamodb');
      const { AttributeType } = require('aws-cdk-lib/aws-dynamodb');
      
      const pivotTable = new Table(stack, 'TeamResourcePivot', {
        partitionKey: { name: 'TeamId', type: AttributeType.STRING },
        sortKey: { name: 'ResourceId', type: AttributeType.STRING }
      });

      const baseCrud = new BaseCrudApi(stack, 'TeamResourcesCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'team-resources',
        Pivot: {
          Table: pivotTable,
          SourceField: 'teamId',
          PivotFields: ['memberId', 'role', 'permissions']
        },
        Operations: {
          List: { OperationName: 'listTeamResources' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Verify Lambda has pivot table permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: ['dynamodb:GetItem', 'dynamodb:BatchGetItem'],
              Effect: 'Allow',
              Resource: { 'Fn::GetAtt': [Match.anyValue(), 'Arn'] }
            }
          ])
        }
      });

      // Verify Lambda environment includes pivot table name
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            PIVOT_TABLE_NAME: { Ref: Match.anyValue() }
          }
        }
      });

      // Verify pivot configuration in VTL template
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          RequestTemplates: {
            'application/json': Match.stringLikeRegexp(
              '.*"Pivot"\\s*:\\s*{.*"SourceField"\\s*:.*teamId.*"PivotFields"\\s*:\\s*\\[.*memberId.*role.*permissions.*\\].*}'
            )
          }
        }
      });
    });
  });

  describe('Multiple Resources Integration', () => {
    test('should handle multiple CRUD resources sharing the same API', () => {
      // Given - Multiple resources in the same API
      const tasksCrud = new BaseCrudApi(stack, 'TasksCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' },
          ListOwned: { OperationName: 'listMyTasks', IndexName: 'ByUserId' }
        }
      });

      const projectsCrud = new BaseCrudApi(stack, 'ProjectsCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'projects',
        Operations: {
          Create: { OperationName: 'createProject' },
          Read: { OperationName: 'getProject' },
          List: { OperationName: 'listProjects' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Verify separate resources exist
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'tasks'
      });

      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'projects'
      });

      // Verify separate DynamoDB tables
      template.resourceCountIs('AWS::DynamoDB::Table', 2);

      // Verify separate Lambda functions
      template.resourceCountIs('AWS::Lambda::Function', 2);

      // Verify table naming conventions
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: {
          'Fn::Join': ['-', [{ Ref: Match.anyValue() }, 'crudStorage', 'tasks']]
        }
      });

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: {
          'Fn::Join': ['-', [{ Ref: Match.anyValue() }, 'crudStorage', 'projects']]
        }
      });
    });
  });

  describe('Error Handling and Response Flow', () => {
    test('should configure proper error handling flow end-to-end', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TasksCrud', {
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

      // Then - Verify comprehensive error response mapping
      const expectedErrorMappings = [
        { statusCode: '400', pattern: 'Bad request' },
        { statusCode: '403', pattern: 'Unauthorized' },
        { statusCode: '404', pattern: 'Item not found' },
        { statusCode: '500', pattern: '(Internal server error|Error:)' }
      ];

      expectedErrorMappings.forEach(({ statusCode, pattern }) => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
          Integration: {
            IntegrationResponses: Match.arrayWith([
              {
                StatusCode: statusCode,
                SelectionPattern: pattern,
                ResponseParameters: {
                  'method.response.header.access-control-allow-origin': "'*'",
                  'method.response.header.access-control-allow-headers': "'*'",
                  'method.response.header.access-control-allow-methods': "'*'",
                  'method.response.header.access-control-allow-credentials': "'true'"
                }
              }
            ])
          },
          MethodResponses: Match.arrayWith([
            {
              StatusCode: statusCode,
              ResponseParameters: {
                'method.response.header.access-control-allow-origin': true,
                'method.response.header.access-control-allow-headers': true,
                'method.response.header.access-control-allow-methods': true,
                'method.response.header.access-control-allow-credentials': true
              }
            }
          ])
        });
      });
    });
  });

  describe('Performance and Scaling Configuration', () => {
    test('should configure optimal performance settings for production workloads', () => {
      // Given - Production-optimized configuration
      const baseCrud = new BaseCrudApi(stack, 'ProdTasksCrud', {
        EnvironmentName: 'production',
        Api: restApi,
        ResourcePath: 'tasks',
        BackendMemory: 3008, // Maximum Lambda memory
        BackendTimeout: { seconds: 15 } as any, // API Gateway max timeout
        Operations: {
          Create: { OperationName: 'createTask' },
          ListOwned: { OperationName: 'listMyTasks', IndexName: 'ByUserId' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Verify optimized Lambda configuration
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 3008,
        Timeout: 15,
        Runtime: 'nodejs18.x'
      });

      // Verify DynamoDB optimizations
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PAY_PER_REQUEST',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true
        }
      });

      // Verify GSI for efficient user-owned queries
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: [
          {
            IndexName: 'ByUserId',
            KeySchema: [
              { AttributeName: 'UserId', KeyType: 'HASH' },
              { AttributeName: 'Id', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' }
          }
        ]
      });
    });
  });
});
