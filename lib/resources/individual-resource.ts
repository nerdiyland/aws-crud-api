import { Resource, Method, RequestValidator, LambdaIntegration, PassthroughBehavior, AuthorizationType, Model } from '@aws-cdk/aws-apigateway';
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
          requestParameters: {
            'integration.request.path.id': 'method.request.path.id'
          },
          requestTemplates: {
            'application/json': JSON.stringify({
              Params: {
                [props.Configuration.IdFieldName || 'Id']: `$input.params('${props.Configuration.IdResourceName || 'id'}')`,
                [props.Configuration.ParentFieldName!]: props.Configuration.ParentResourceName ? `$input.params('${props.Configuration.ParentResourceName}')` : undefined,
                UserId: '$context.identity.caller',
                OperationName: 'getItemById',
              },
            }).split('"\'').join('').split('\'"').join('')
          },
          integrationResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.access-control-allow-origin': `'*'`,
                'method.response.header.access-control-allow-headers': `'*'`,
                'method.response.header.access-control-allow-methods': `'*'`,
                'method.response.header.access-control-allow-credentials': `'true'`,
              }
            },
            {
              statusCode: '404',
              selectionPattern: 'ENTITY_NOT_FOUND',
              responseParameters: {
                'method.response.header.access-control-allow-origin': `'*'`,
                'method.response.header.access-control-allow-headers': `'*'`,
                'method.response.header.access-control-allow-methods': `'*'`,
                'method.response.header.access-control-allow-credentials': `'true'`,
              }
            }
          ],
          passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES
        }),
        options: {
          authorizationType: AuthorizationType.IAM,
          operationName: props.Configuration.Operations.Read.OperationName || 'getById',
          requestValidator: requestValidator,
          requestParameters: {
            'method.request.path.id': true
          },
          requestModels: !props.Configuration.Operations.Read.InputModel ? undefined : {
            'application/json': props.Configuration.Operations.Read.InputModel
          },
          methodResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.access-control-allow-origin': true,
                'method.response.header.access-control-allow-headers': true,
                'method.response.header.access-control-allow-methods': true,
                'method.response.header.access-control-allow-credentials': true
              },
              responseModels: props.Configuration.Operations.Read.Response && props.Configuration.Operations.Read.Response!.Model ? {
                'application/json': props.Configuration.Operations.Read.Response!.Model
              } : undefined,
            },
            {
              statusCode: '404',
              responseParameters: {
                'method.response.header.access-control-allow-origin': true,
                'method.response.header.access-control-allow-headers': true,
                'method.response.header.access-control-allow-methods': true,
                'method.response.header.access-control-allow-credentials': true
              }
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
          requestParameters: {
            'integration.request.path.id': 'method.request.path.id'
          },
          requestTemplates: {
            'application/json': JSON.stringify({
              Params: {
                Id: "$input.params('id')",
                UserId: '$context.identity.caller',
                OperationName: 'updateItem',
                IdFieldName: props.Configuration.IdFieldName,
                ParentFieldName: props.Configuration.ParentFieldName,
              },
              Data: "'$input.json('$')'"
            }).split('"\'').join('').split('\'"').join('')
          },
          integrationResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.access-control-allow-origin': `'*'`,
                'method.response.header.access-control-allow-headers': `'*'`,
                'method.response.header.access-control-allow-methods': `'*'`,
                'method.response.header.access-control-allow-credentials': `'true'`,
              }
            },
            
          ],
          passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES
        }),
        options: {
          authorizationType: AuthorizationType.IAM,
          operationName: props.Configuration.Operations.Update.OperationName || 'update',
          requestValidator: requestValidator,
          requestParameters: {
            'method.request.path.id': true
          },
          requestModels: props.Configuration.Operations.Update!.InputModel ? {
            'application/json': props.Configuration.Operations.Update!.InputModel
          } : undefined,
          methodResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.access-control-allow-origin': true,
                'method.response.header.access-control-allow-headers': true,
                'method.response.header.access-control-allow-methods': true,
                'method.response.header.access-control-allow-credentials': true
              },
              responseModels: props.Configuration.Operations.Update.Response && props.Configuration.Operations.Update.Response!.Model ? {
                'application/json': props.Configuration.Operations.Update.Response!.Model
              } : undefined,
            },
            {
              statusCode: '404',
              responseParameters: {
                'method.response.header.access-control-allow-origin': true,
                'method.response.header.access-control-allow-headers': true,
                'method.response.header.access-control-allow-methods': true,
                'method.response.header.access-control-allow-credentials': true
              }
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
          requestParameters: {
            'integration.request.path.id': 'method.request.path.id'
          },
          requestTemplates: {
            'text/plain': JSON.stringify({
              Params: {
                [props.Configuration.IdFieldName || 'Id']: `$input.params('${props.Configuration.IdResourceName || 'id'}')`,
                [props.Configuration.ParentFieldName!]: props.Configuration.ParentResourceName ? `$input.params('${props.Configuration.ParentResourceName}')` : undefined,
                UserId: '$context.identity.caller',
                OperationName: 'deleteItem',
              }
            }).split('"\'').join('').split('\'"').join('')
          },
          integrationResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.access-control-allow-origin': `'*'`,
                'method.response.header.access-control-allow-headers': `'*'`,
                'method.response.header.access-control-allow-methods': `'*'`,
                'method.response.header.access-control-allow-credentials': `'true'`,
              }
            },
            {
              statusCode: '404',
              responseParameters: {
                'method.response.header.access-control-allow-origin': `'*'`,
                'method.response.header.access-control-allow-headers': `'*'`,
                'method.response.header.access-control-allow-methods': `'*'`,
                'method.response.header.access-control-allow-credentials': `'true'`,
              },
              selectionPattern: 'ENTITY_NOT_FOUND'
            }
          ],
          passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES
        }),
        options: {
          authorizationType: AuthorizationType.IAM,
          operationName: props.Configuration.Operations.Delete.OperationName || 'delete',
          requestParameters: {
            'method.request.path.id': true
          },
          methodResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.access-control-allow-origin': true,
                'method.response.header.access-control-allow-headers': true,
                'method.response.header.access-control-allow-methods': true,
                'method.response.header.access-control-allow-credentials': true
              },
            },
            {
              statusCode: '404',
              responseParameters: {
                'method.response.header.access-control-allow-origin': true,
                'method.response.header.access-control-allow-headers': true,
                'method.response.header.access-control-allow-methods': true,
                'method.response.header.access-control-allow-credentials': true
              }
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