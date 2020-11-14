import { Resource, Method, RequestValidator, LambdaIntegration, PassthroughBehavior, AuthorizationType } from '@aws-cdk/aws-apigateway';
import { Construct } from '@aws-cdk/core';
import { ResourceConfiguration } from './global-resource';
import { Function } from '@aws-cdk/aws-lambda';
import { PolicyStatement } from '@aws-cdk/aws-iam';


/**
 * Defines the methods that require an entity Id to operate.
 * These methods are `getById`, `update` and `delete`
 */
export class IndividualCRUDResource extends Resource {
  
  /**
   * Method to get an entity by id
   */
  public readonly getByIdMethod: Method;

  /**
   * Method to update an entity
   */
  public readonly updateMethod: Method;

  /**
   * Method to delete an entity
   */
  public readonly deleteMethod: Method;

  constructor(scope: Construct, id: string, props: ResourceConfiguration) {
    super(scope, id, props);

    const requestValidator = new RequestValidator(this, 'IndividualCrudRequestValidator', {
      restApi: this.api,
      validateRequestBody: true,
      validateRequestParameters: true
    });

    // Get entity by Id
    this.getByIdMethod = new Method(this, 'GetByIdMethod', {
      httpMethod: 'GET',
      resource: this,
      integration: new LambdaIntegration(props.Configuration.BackendFunction, {
        proxy: false,
        credentialsPassthrough: true,
        requestTemplates: {
          'application/json': JSON.stringify({
            UserId: '$context.identity.caller',
            TeamId: '$context.identity.cognitoIdentityPoolId',
            OperationName: 'getById',
            Data: {
              Id: "$input.params('entityId')"
            }
          }).split('"\'').join('').split('\'"').join('')
        },
        integrationResponses: [
          {
            statusCode: '200'
          },
          {
            statusCode: '404',
            selectionPattern: 'ENTITY_NOT_FOUND'
          }
        ],
        passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES
      }),
      options: {
        authorizationType: AuthorizationType.IAM,
        operationName: 'getById',
        requestValidator: requestValidator,
        methodResponses: [
          {
            statusCode: '200'
          },
          {
            statusCode: '404'
          }
        ]
      }
    });

    // Update entity
    this.updateMethod = new Method(this, 'UpdateMethod', {
      httpMethod: 'PUT',
      resource: this,
      integration: new LambdaIntegration(props.Configuration.BackendFunction, {
        proxy: false,
        credentialsPassthrough: true,
        requestTemplates: {
          'application/json': JSON.stringify({
            UserId: '$context.identity.caller',
            TeamId: '$context.identity.cognitoIdentityPoolId',
            OperationName: 'update',
            Data: {
              Id: "$input.params('entityId')",
              Changes: "'$input.json('$')'"
            }
          }).split('"\'').join('').split('\'"').join('')
        },
        integrationResponses: [
          {
            statusCode: '200'
          },
          
        ],
        passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES
      }),
      options: {
        authorizationType: AuthorizationType.IAM,
        operationName: 'update',
        requestValidator: requestValidator,
        methodResponses: [
          {
            statusCode: '200',
            // TODO Response model
          },
          {
            statusCode: '404'
          }
        ]
      }
    });

    // Delete entity
    this.deleteMethod = new Method(this, 'DeleteMethod', {
      httpMethod: 'DELETE',
      resource: this,
      integration: new LambdaIntegration(props.Configuration.BackendFunction, {
        proxy: false,
        credentialsPassthrough: true,
        requestTemplates: {
          'application/json': JSON.stringify({
            UserId: '$context.identity.caller',
            TeamId: '$context.identity.cognitoIdentityPoolId',
            OperationName: 'delete',
            Data: {
              Id: "$input.params('entityId')"
            }
          }).split('"\'').join('').split('\'"').join('')
        },
        integrationResponses: [
          {
            statusCode: '204'
          },
          {
            statusCode: '404',
            selectionPattern: 'ENTITY_NOT_FOUND'
          }
        ],
        passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES
      }),
      options: {
        authorizationType: AuthorizationType.IAM,
        operationName: 'delete',
        requestValidator: requestValidator,
        methodResponses: [
          {
            statusCode: '204'
          },
          {
            statusCode: '404'
          }
        ]
      }
    });

    // Add permissions to function to handle these methods
    props.Configuration.BackendFunction.addToRolePolicy(new PolicyStatement({
      actions: [
        'dynamodb:GetItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem'
      ],
      resources: [
        props.Configuration.Table.tableArn
      ]
    }));
  }
}