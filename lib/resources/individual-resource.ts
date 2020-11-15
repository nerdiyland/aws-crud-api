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
  public readonly getItemByIdMethod: Method;

  /**
   * Method to update an entity
   */
  public readonly updateItemMethod: Method;

  /**
   * Method to delete an entity
   */
  public readonly deleteItemMethod: Method;

  constructor(scope: Construct, id: string, props: ResourceConfiguration) {
    super(scope, id, props);

    const requestValidator = new RequestValidator(this, 'IndividualCrudRequestValidator', {
      restApi: this.api,
      validateRequestBody: true,
      validateRequestParameters: true
    });

    // Get entity by Id
    if (props.Configuration.Operations.Read) {
      this.getItemByIdMethod = new Method(this, 'GetItemByIdMethod', {
        httpMethod: 'GET',
        resource: this,
        integration: new LambdaIntegration(props.Configuration.BackendFunction, {
          proxy: false,
          credentialsPassthrough: true,
          requestTemplates: {
            'application/json': JSON.stringify({
              Params: {
                Id: "$input.params('entityId')",
                UserId: '$context.identity.caller',
                OperationName: 'getItemById',
              },
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
    }

    // Update entity
    if (props.Configuration.Operations.Update) {
      this.updateItemMethod = new Method(this, 'UpdateItemMethod', {
        httpMethod: 'PUT',
        resource: this,
        integration: new LambdaIntegration(props.Configuration.BackendFunction, {
          proxy: false,
          credentialsPassthrough: true,
          requestTemplates: {
            'application/json': JSON.stringify({
              Params: {
                Id: "$input.params('entityId')",
                UserId: '$context.identity.caller',
                OperationName: 'updateItem',
              },
              Data: "'$input.json('$')'"
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
    }

    // Delete entity
    if (props.Configuration.Operations.Delete) {
      this.deleteItemMethod = new Method(this, 'DeleteItemMethod', {
        httpMethod: 'DELETE',
        resource: this,
        integration: new LambdaIntegration(props.Configuration.BackendFunction, {
          proxy: false,
          credentialsPassthrough: true,
          requestTemplates: {
            'application/json': JSON.stringify({
              Params: {
                Id: "$input.params('entityId')",
                UserId: '$context.identity.caller',
                OperationName: 'deleteItem',
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
    }

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