import { Template, Match, Capture } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { BaseCrudApi } from '../../lib/base-crud';

describe('BaseCrudApi Infrastructure Tests', () => {
  let stack: Stack;
  let template: Template;
  let restApi: RestApi;

  beforeEach(() => {
    stack = new Stack();
    restApi = new RestApi(stack, 'TestApi', {
      restApiName: 'TestAPI'
    });
  });

  describe('DynamoDB Table Configuration', () => {
    test('should create table with correct partition key for simple resources', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'items',
        Operations: {
          Create: { OperationName: 'createItem' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        AttributeDefinitions: [
          {
            AttributeName: 'Id',
            AttributeType: 'S'
          },
          {
            AttributeName: 'UserId',
            AttributeType: 'S'
          }
        ],
        KeySchema: [
          {
            AttributeName: 'Id',
            KeyType: 'HASH'
          }
        ],
        BillingMode: 'PAY_PER_REQUEST',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true
        }
      });
    });

    test('should create table with composite key for parent-child resources', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'items',
        ParentResourceName: 'parent',
        ParentFieldName: 'ParentId',
        IdFieldName: 'ItemId',
        Operations: {
          Create: { OperationName: 'createItem' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [
          {
            AttributeName: 'ParentId',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'ItemId',
            KeyType: 'RANGE'
          }
        ]
      });
    });

    test('should create ByUserId GSI for user-owned resources', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'items',
        Operations: {
          Create: { OperationName: 'createItem' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: [
          {
            IndexName: 'ByUserId',
            KeySchema: [
              {
                AttributeName: 'UserId',
                KeyType: 'HASH'
              },
              {
                AttributeName: 'Id',
                KeyType: 'RANGE'
              }
            ],
            Projection: {
              ProjectionType: 'ALL'
            }
          }
        ]
      });
    });

    test('should use correct table naming convention', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks/{id}/comments',
        Operations: {
          Create: { OperationName: 'createComment' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: {
          'Fn::Join': [
            '-',
            [
              { Ref: Match.anyValue() },
              'crudStorage',
              'tasks/id/comments'
            ]
          ]
        }
      });
    });
  });

  describe('Lambda Function Configuration', () => {
    test('should create Lambda function with correct configuration', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'items',
        Operations: {
          Create: { OperationName: 'createItem' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs18.x',
        Handler: 'index.handler',
        MemorySize: 1024,
        Timeout: 10,
        Description: 'items - Standard backend for CRUD apis'
      });
    });

    test('should configure Lambda environment variables correctly', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'prod',
        Api: restApi,
        ResourcePath: 'tasks',
        IdResourceName: 'taskId',
        ParentResourceName: 'project',
        ParentFieldName: 'ProjectId',
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            ITEMS_TABLE_NAME: { Ref: Match.anyValue() },
            ITEMS_BUCKET_NAME: '',
            ID_PARAM_NAME: 'taskId',
            PARENT_PARAM_NAME: 'ProjectId',
            IOT_ENDPOINT_ADDRESS: 'none',
            ENVIRONMENT_NAME: 'prod',
            TEAM_MEMBERSHIPS_TABLE_NAME: 'none',
            TEAM_RESOURCES_TABLE_NAME: 'none',
            PIVOT_TABLE_NAME: 'none'
          }
        }
      });
    });

    test('should use custom memory and timeout when specified', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'items',
        BackendMemory: 2048,
        BackendTimeout: { seconds: 30 } as any,
        Operations: {
          Create: { OperationName: 'createItem' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 2048,
        Timeout: 30
      });
    });
  });

  describe('IAM Permissions Configuration', () => {
    test('should grant DynamoDB permissions to Lambda function', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'items',
        Operations: {
          Create: { OperationName: 'createItem' },
          Read: { OperationName: 'getItem' },
          Update: { OperationName: 'updateItem' },
          Delete: { OperationName: 'deleteItem' },
          List: { OperationName: 'listItems' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: [
                'dynamodb:PutItem',
                'dynamodb:Scan'
              ],
              Effect: 'Allow',
              Resource: { 'Fn::GetAtt': [Match.anyValue(), 'Arn'] }
            },
            {
              Action: [
                'dynamodb:GetItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem'
              ],
              Effect: 'Allow',
              Resource: { 'Fn::GetAtt': [Match.anyValue(), 'Arn'] }
            }
          ])
        }
      });
    });

    test('should grant IoT publish permissions when environment is set', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'production',
        Api: restApi,
        ResourcePath: 'items',
        Operations: {
          Create: { OperationName: 'createItem' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
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

    test('should grant GSI query permissions when ListOwned operation uses index', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'items',
        Operations: {
          ListOwned: { 
            OperationName: 'listMyItems',
            IndexName: 'ByUserId'
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: ['dynamodb:Query'],
              Effect: 'Allow',
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

  describe('CloudFormation Outputs', () => {
    test('should create outputs for component metadata', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'items',
        Operations: {
          Create: { OperationName: 'createItem' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasOutput('TestCrudComponentName', {
        Value: { Ref: Match.anyValue() }
      });
      
      template.hasOutput('TestCrudComponentType', {
        Value: 'rest'
      });
      
      template.hasOutput('TestCrudEntryPoint', {
        Value: {
          'Fn::Join': [
            '',
            [
              'https://',
              { Ref: Match.anyValue() },
              '.execute-api.',
              { Ref: 'AWS::Region' },
              '.',
              { Ref: 'AWS::URLSuffix' },
              '/prod/'
            ]
          ]
        }
      });
    });
  });

  describe('Resource Dependency Validation', () => {
    test('should ensure proper dependency order between resources', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'items',
        Operations: {
          Create: { OperationName: 'createItem' },
          List: { OperationName: 'listItems' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Lambda function should depend on DynamoDB table
      const lambdaLogicalId = template.findResources('AWS::Lambda::Function');
      const tableLogicalId = template.findResources('AWS::DynamoDB::Table');
      
      expect(Object.keys(lambdaLogicalId)).toHaveLength(1);
      expect(Object.keys(tableLogicalId)).toHaveLength(1);
      
      // Verify that environment variables reference the table
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            ITEMS_TABLE_NAME: { Ref: Match.anyValue() }
          }
        }
      });
    });
  });
});
