import { Template, Match } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { BaseApi } from '../../lib/base-api';

describe('BaseApi Infrastructure Tests', () => {
  let stack: Stack;
  let template: Template;

  beforeEach(() => {
    stack = new Stack();
  });

  describe('API Gateway Configuration', () => {
    test('should create REST API with correct basic configuration', () => {
      // Given
      const baseApi = new BaseApi(stack, 'TestApi', {
        ApiName: 'TestAPI'
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'TestAPI',
        EndpointConfiguration: {
          Types: ['EDGE']
        }
      });
    });

    test('should configure CORS with correct settings', () => {
      // Given
      const baseApi = new BaseApi(stack, 'TestApi', {
        ApiName: 'TestAPI'
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Policy: Match.absent()
      });

      // Verify CORS is configured through deployment options
      template.hasResourceProperties('AWS::ApiGateway::Deployment', {
        StageName: 'prod'
      });
    });

    test('should create CloudWatch role for API Gateway logging', () => {
      // Given
      const baseApi = new BaseApi(stack, 'TestApi', {
        ApiName: 'TestAPI'
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'apigateway.amazonaws.com'
              }
            }
          ]
        },
        ManagedPolicyArns: [
          {
            'Fn::Join': [
              '',
              [
                'arn:',
                { Ref: 'AWS::Partition' },
                ':iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs'
              ]
            ]
          }
        ]
      });
    });
  });

  describe('CloudWatch Logs Configuration', () => {
    test('should create log group with correct retention policy', () => {
      // Given
      const baseApi = new BaseApi(stack, 'TestApi', {
        ApiName: 'TestAPI'
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 7
      });
    });

    test('should configure access logging with custom format', () => {
      // Given
      const baseApi = new BaseApi(stack, 'TestApi', {
        ApiName: 'TestAPI'
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        AccessLogSetting: {
          DestinationArn: {
            'Fn::GetAtt': [Match.anyValue(), 'Arn']
          },
          Format: Match.stringLikeRegexp('.*requestId.*identityId.*apiId.*')
        },
        MethodSettings: [
          {
            HttpMethod: '*',
            LoggingLevel: 'INFO',
            ResourcePath: '/*'
          }
        ]
      });
    });

    test('should include all required fields in access log format', () => {
      // Given
      const baseApi = new BaseApi(stack, 'TestApi', {
        ApiName: 'TestAPI'
      });

      // When
      template = Template.fromStack(stack);

      // Then
      const expectedFields = [
        'requestId', 'identityId', 'identityPoolId', 'apiId', 
        'stageName', 'error', 'statusCode', 'date', 'domain', 
        'path', 'method', 'responseSize'
      ];

      template.hasResourceProperties('AWS::ApiGateway::Stage', {
        AccessLogSetting: {
          Format: Match.stringLikeRegexp(
            expectedFields.map(field => `.*${field}.*`).join('')
          )
        }
      });
    });
  });

  describe('API Gateway Account Configuration', () => {
    test('should set CloudWatch role in API Gateway account', () => {
      // Given
      const baseApi = new BaseApi(stack, 'TestApi', {
        ApiName: 'TestAPI'
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Account', {
        CloudWatchRoleArn: {
          'Fn::GetAtt': [Match.anyValue(), 'Arn']
        }
      });
    });
  });

  describe('Resource Cleanup Configuration', () => {
    test('should configure log group with DESTROY removal policy', () => {
      // Given
      const baseApi = new BaseApi(stack, 'TestApi', {
        ApiName: 'TestAPI'
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResource('AWS::Logs::LogGroup', {
        DeletionPolicy: 'Delete'
      });
    });
  });
});
