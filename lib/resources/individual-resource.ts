import { Resource, Method, RequestValidator, LambdaIntegration, PassthroughBehavior, AuthorizationType, Model } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { ResourceConfiguration } from './global-resource';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';


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

    const requestValidator = props.Validator || new RequestValidator(this, 'IndividualCrudRequestValidator', {
      restApi: this.api,
      validateRequestBody: true,
      validateRequestParameters: true
    });

    const integrationResponseParameters = {
      'method.response.header.access-control-allow-origin': `'*'`,
      'method.response.header.access-control-allow-headers': `'*'`,
      'method.response.header.access-control-allow-methods': `'*'`,
      'method.response.header.access-control-allow-credentials': `'true'`,
    }

    const methodResponseParameters = {
      'method.response.header.access-control-allow-origin': true,
      'method.response.header.access-control-allow-headers': true,
      'method.response.header.access-control-allow-methods': true,
      'method.response.header.access-control-allow-credentials': true
    }

    // Get entity by Id
    if (props.Configuration.Operations.Read) {
      const configSource = props.Configuration.Operations.Read;
      this.getItemByIdMethod = new Method(this, 'GetItemByIdMethod', {
        httpMethod: 'GET',
        resource: this,
        integration: new LambdaIntegration(props.Configuration.BackendFunction, {
          proxy: false,
          credentialsPassthrough: false,
          requestParameters: {
            'integration.request.path.id': 'method.request.path.id',

            // Add `ParentId` to integration parameters
            ...(!configSource!.ParentId ? {} : {
              [`integration.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`]: `method.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`
            })
          },
          requestTemplates: {
            'application/json': JSON.stringify({
              Params: {
                ...(props.Configuration.AdditionalParams || {}),
                Id: "$input.params('id')",
                InputUserId: `$input.params('X-AFTERSIGNALS-USER-ID')`,
                UserId: props.Configuration.UserId || '$context.identity.cognitoIdentityId',
                OperationName: 'getItemById',
                IdFieldName: props.Configuration.IdFieldName,
                ParentFieldName: props.Configuration.ParentFieldName,
                OwnerFieldName: props.Configuration.OwnerFieldName,
                S3Fields: props.Configuration.S3Fields,
                Security: configSource.Security,
                ParentId: configSource!.ParentId ? `$input.params('${configSource!.ParentId!.Param}')` : 'none'
              },
            }).split('"\'').join('').split('\'"').join('')
          },
          integrationResponses: [
            {
              statusCode: '200',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '404',
              selectionPattern: 'Item not found',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '400',
              selectionPattern: 'Bad request',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '403',
              selectionPattern: 'Unauthorized',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '500',
              selectionPattern: '(Internal server error|Error:)',
              responseParameters: integrationResponseParameters
            }
          ],
          passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES
        }),
        options: {
          authorizationType: AuthorizationType.IAM,
          operationName: props.Configuration.Operations.Read.OperationName || 'getById',
          requestValidator: requestValidator,
          requestParameters: {
            'method.request.path.id': true,

            // Add `ParentId` to required method parameters
            ...(!configSource!.ParentId ? {} : {
              [`method.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`]: true
            })
          },
          requestModels: !props.Configuration.Operations.Read.InputModel ? undefined : {
            'application/json': props.Configuration.Operations.Read.InputModel
          },
          methodResponses: [
            {
              statusCode: '200',
              responseParameters: methodResponseParameters,
              responseModels: props.Configuration.Operations.Read.Response && props.Configuration.Operations.Read.Response!.Model ? {
                'application/json': props.Configuration.Operations.Read.Response!.Model
              } : undefined,
            },
            {
              statusCode: '400',
              responseParameters: methodResponseParameters
            },
            {
              statusCode: '403',
              responseParameters: methodResponseParameters
            },
            {
              statusCode: '404',
              responseParameters: methodResponseParameters
            },
            {
              statusCode: '500',
              responseParameters: methodResponseParameters
            }
          ]
        }
      });
    }

    // Update entity
    if (props.Configuration.Operations.Update) {
      const configSource = props.Configuration.Operations.Update;

      this.updateItemMethod = new Method(this, 'UpdateItemMethod', {
        httpMethod: 'PUT',
        resource: this,
        integration: new LambdaIntegration(props.Configuration.BackendFunction, {
          proxy: false,
          credentialsPassthrough: false,
          requestParameters: {
            'integration.request.path.id': 'method.request.path.id',

            // Add `ParentId` to integration parameters
            ...(!configSource!.ParentId ? {} : {
              [`integration.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`]: `method.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`
            })
          },
          requestTemplates: {
            'application/json': JSON.stringify({
              Params: {
                ...(props.Configuration.AdditionalParams || {}),
                Id: "$input.params('id')",
                InputUserId: `$input.params('X-AFTERSIGNALS-USER-ID')`,
                UserId: props.Configuration.UserId || '$context.identity.cognitoIdentityId',
                OperationName: 'updateItem',
                IdFieldName: props.Configuration.IdFieldName,
                ParentFieldName: props.Configuration.ParentFieldName,
                OwnerFieldName: props.Configuration.OwnerFieldName,
                S3Fields: props.Configuration.S3Fields,
                Security: configSource.Security,
                ParentId: configSource!.ParentId ? `$input.params('${configSource!.ParentId!.Param}')` : 'none'
              },
              Data: "'$input.json('$')'"
            }).split('"\'').join('').split('\'"').join('')
          },
          integrationResponses: [
            {
              statusCode: '200',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '404',
              selectionPattern: 'Item not found',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '400',
              selectionPattern: 'Bad request',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '403',
              selectionPattern: 'Unauthorized',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '500',
              selectionPattern: '(Internal server error|Error:)',
              responseParameters: integrationResponseParameters
            }
          ],
          passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES
        }),
        options: {
          authorizationType: AuthorizationType.IAM,
          operationName: props.Configuration.Operations.Update.OperationName || 'update',
          requestValidator: requestValidator,
          requestParameters: {
            'method.request.path.id': true,

            // Add `ParentId` to required method parameters
            ...(!configSource!.ParentId ? {} : {
              [`method.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`]: true
            })
          },
          requestModels: props.Configuration.Operations.Update!.InputModel ? {
            'application/json': props.Configuration.Operations.Update!.InputModel
          } : undefined,
          methodResponses: [
            {
              statusCode: '200',
              responseParameters: methodResponseParameters,
              responseModels: props.Configuration.Operations.Update.Response && props.Configuration.Operations.Update.Response!.Model ? {
                'application/json': props.Configuration.Operations.Update.Response!.Model
              } : undefined,
            },
            {
              statusCode: '400',
              responseParameters: methodResponseParameters
            },
            {
              statusCode: '403',
              responseParameters: methodResponseParameters
            },
            {
              statusCode: '404',
              responseParameters: methodResponseParameters
            },
            {
              statusCode: '500',
              responseParameters: methodResponseParameters
            }
          ]
        }
      });
    }

    // Delete entity
    if (props.Configuration.Operations.Delete) {
      const configSource = props.Configuration.Operations.Delete;

      this.deleteItemMethod = new Method(this, 'DeleteItemMethod', {
        httpMethod: 'DELETE',
        resource: this,
        integration: new LambdaIntegration(props.Configuration.BackendFunction, {
          proxy: false,
          credentialsPassthrough: false,
          requestParameters: {
            'integration.request.path.id': 'method.request.path.id',

            // Add `ParentId` to integration parameters
            ...(!configSource!.ParentId ? {} : {
              [`integration.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`]: `method.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`
            })
          },
          requestTemplates: {
            'text/plain': JSON.stringify({
              Params: {
                ...(props.Configuration.AdditionalParams || {}),
                Id: "$input.params('id')",
                InputUserId: `$input.params('X-AFTERSIGNALS-USER-ID')`,
                UserId: props.Configuration.UserId || '$context.identity.cognitoIdentityId',
                OperationName: 'deleteItem',
                IdFieldName: props.Configuration.IdFieldName,
                ParentFieldName: props.Configuration.ParentFieldName,
                OwnerFieldName: props.Configuration.OwnerFieldName,
                S3Fields: props.Configuration.S3Fields,
                Security: configSource.Security,
                ParentId: configSource!.ParentId ? `$input.params('${configSource!.ParentId!.Param}')` : 'none'
              }
            }).split('"\'').join('').split('\'"').join(''),
            
            'application/json': JSON.stringify({
              Params: {
                ...(props.Configuration.AdditionalParams || {}),
                Id: "$input.params('id')",
                InputUserId: `$input.params('X-AFTERSIGNALS-USER-ID')`,
                UserId: props.Configuration.UserId || '$context.identity.cognitoIdentityId',
                OperationName: 'deleteItem',
                IdFieldName: props.Configuration.IdFieldName,
                ParentFieldName: props.Configuration.ParentFieldName,
                OwnerFieldName: props.Configuration.OwnerFieldName,
                S3Fields: props.Configuration.S3Fields,
                Security: configSource.Security,
                ParentId: configSource!.ParentId ? `$input.params('${configSource!.ParentId!.Param}')` : 'none'
              }
            }).split('"\'').join('').split('\'"').join('')
          },
          integrationResponses: [
            {
              statusCode: '204',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '404',
              selectionPattern: 'Item not found',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '400',
              selectionPattern: 'Bad request',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '403',
              selectionPattern: 'Unauthorized',
              responseParameters: integrationResponseParameters
            },
            {
              statusCode: '500',
              selectionPattern: '(Internal server error|Error:)',
              responseParameters: integrationResponseParameters
            }
          ],
          passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES
        }),
        options: {
          authorizationType: AuthorizationType.IAM,
          operationName: props.Configuration.Operations.Delete.OperationName || 'delete',
          requestParameters: {
            'method.request.path.id': true,

            // Add `ParentId` to required method parameters
            ...(!configSource!.ParentId ? {} : {
              [`method.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`]: true
            })
          },
          methodResponses: [
            {
              statusCode: '204',
              responseParameters: methodResponseParameters,
            },
            {
              statusCode: '400',
              responseParameters: methodResponseParameters
            },
            {
              statusCode: '403',
              responseParameters: methodResponseParameters
            },
            {
              statusCode: '404',
              responseParameters: methodResponseParameters
            },
            {
              statusCode: '500',
              responseParameters: methodResponseParameters
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