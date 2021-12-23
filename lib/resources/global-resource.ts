import { AuthorizationType, LambdaIntegration, Method, MethodOptions, Model, PassthroughBehavior, RequestValidator, Resource, ResourceProps } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { BaseCrudApiProps } from "../models";
import { IFunction } from "aws-cdk-lib/aws-lambda";

export interface ExtendedConfiguration extends BaseCrudApiProps {
  BackendFunction: IFunction;
  Table: ITable;
}

export interface ResourceConfiguration extends ResourceProps {
  Configuration: ExtendedConfiguration;
  Validator?: RequestValidator;
}

/**
 * Defines an API resource capable of handling CRUD requests for entities.
 */
export class GlobalCRUDResource extends Resource {

  /**
   * Method for creating entities
   */
  public readonly createItemMethod: Method;

  /**
   * Method for listing entities
   */
  public readonly listItemsMethod: Method;

  constructor (scope: Construct, id: string, props: ResourceConfiguration) {
    super(scope, id, props);

    // Assign permissions to function to access entities table
    // Create 
    // Scan entities
    props.Configuration.BackendFunction.addToRolePolicy(new PolicyStatement({
      actions: [
        'dynamodb:PutItem',
        'dynamodb:Scan'
      ],
      resources: [
        props.Configuration.Table.tableArn
      ]
    }));

    /*
     * START Define methods
     */

    const requestValidator = props.Validator || new RequestValidator(this, 'GlobalCrudRequestValidator', {
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

    // TODO Define models
    
    // Create item
    if(props.Configuration.Operations.Create) {
      let inputModel: Model;
      const createSource = props.Configuration.Operations.Create;
      
      const createMethodOptions: MethodOptions = {
        authorizationType: AuthorizationType.IAM,
        operationName: props.Configuration.Operations.Create!.OperationName,
        // TODO Response models
        requestParameters: {

          // Add `ParentId` to required method parameters
          ...(!createSource!.ParentId ? {} : {
            [`method.request.${createSource!.ParentId!.Source}.${createSource!.ParentId!.Param}`]: true
          })

          // TODO Other parameters
        },
        requestValidator: requestValidator,
        methodResponses: [
          {
            statusCode: '201',
            responseModels: props.Configuration.Operations.Create.Response && props.Configuration.Operations.Create.Response!.Model ? {
              'application/json': props.Configuration.Operations.Create.Response!.Model
            } : undefined,
            responseParameters: methodResponseParameters
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
            statusCode: '500',
            responseParameters: methodResponseParameters
          }
        ]
      };
        
      if (props.Configuration.Operations.Create!.InputModel) {
        // @ts-ignore
        createMethodOptions.requestModels = {
          'application/json': props.Configuration.Operations.Create!.InputModel
        }
      }

      
      const fn = createSource.BackendFunction || props.Configuration.BackendFunction;
      this.createItemMethod = new Method(this, 'CreateItemMethod', {
        httpMethod: 'POST',
        resource: this,
        integration: new LambdaIntegration(fn, {
          proxy: false,
          credentialsPassthrough: false,
          requestParameters: {
            // Add `ParentId` to integration parameters
            ...(!createSource!.ParentId ? {} : {
              [`integration.request.${createSource!.ParentId!.Source}.${createSource!.ParentId!.Param}`]: `method.request.${createSource!.ParentId!.Source}.${createSource!.ParentId!.Param}`,
            })
          },
          requestTemplates: {
            'application/json': JSON.stringify({
              Params: {
                InputUserId: `$input.params('X-AFTERSIGNALS-USER-ID')`,
                UserId: props.Configuration.UserId || '$context.identity.cognitoIdentityId',
                OperationName: 'createItem',
                EntitySchema: props.Configuration.EntitySchema,
                IdFieldName: props.Configuration.IdFieldName,
                ParentFieldName: props.Configuration.ParentFieldName,
                S3Fields: props.Configuration.S3Fields,
                OutputFields: (createSource!.Response! || {}).Fields,
                ParentId: createSource!.ParentId ? `$input.params('${createSource!.ParentId!.Param}')` : 'none',
                Security: createSource!.Security,
                SuccessEvent: createSource!.SuccessEvent
              },
              Data: "'$input.json('$')'"
            }).split('"\'').join('').split('\'"').join('')
          },
          integrationResponses: [
            {
              statusCode: '201',
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
        options: createMethodOptions
      });
    }

    // List items
    if (props.Configuration.Operations.List || props.Configuration.Operations.ListOwned) {
      const configSource = props.Configuration.Operations.List ? props.Configuration.Operations.List : props.Configuration.Operations.ListOwned;
      const listType = configSource === props.Configuration.Operations.List ? 'global' : 'owned';

      if (configSource!.IndexName) {
        props.Configuration.BackendFunction.addToRolePolicy(new PolicyStatement({
          actions: [
            'dynamodb:Query',
          ],
          resources: [
            `${props.Configuration.Table.tableArn}/index/${configSource?.IndexName}`
          ]
        }));
      }

      this.listItemsMethod = new Method(this, 'ListItemsMethod', {
        httpMethod: 'GET',
        resource: this,
        integration: new LambdaIntegration(props.Configuration.BackendFunction, {
          proxy: false,
          credentialsPassthrough: false,
          requestTemplates: {
            'application/json': JSON.stringify({
              Params: {
                InputUserId: `$input.params('X-AFTERSIGNALS-USER-ID')`,
                UserId: props.Configuration.UserId || '$context.identity.cognitoIdentityId',
                OperationName: 'listItems',
                ListType: listType,
                IndexName: configSource!.IndexName,
                EntitySchema: props.Configuration.EntitySchema,
                IdFieldName: props.Configuration.IdFieldName,
                ParentFieldName: props.Configuration.ParentFieldName,
                Security: configSource!.Security,
                ParentId: configSource!.ParentId ? `$input.params('${configSource!.ParentId!.Param}')` : 'none',
                Pivot: !props.Configuration.Pivot ? 'none' : {
                  SourceField: props.Configuration.Pivot!.SourceField,
                  PivotFields: props.Configuration.Pivot!.PivotFields
                }
              },
              Data: "'$input.json('$')'" // TODO
            }).split('"\'').join('').split('\'"').join('')
          },
          requestParameters: {
            // Add `ParentId` to integration parameters
            ...(!configSource!.ParentId ? {} : {
              [`integration.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`]: `method.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`
            })
          },
          integrationResponses: [
            {
              statusCode: '200',
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
          operationName: configSource!.OperationName,
          requestModels: !configSource!.InputModel ? undefined : {
            'application/json': configSource!.InputModel
          },
          requestParameters: {

            // Add `ParentId` to required method parameters
            ...(!configSource!.ParentId ? {} : {
              [`method.request.${configSource!.ParentId!.Source}.${configSource!.ParentId!.Param}`]: true
            })

            // TODO Other parameters
          },
          requestValidator: requestValidator,
          methodResponses: [
            {
              statusCode: '200',
              responseModels: configSource!.Response && configSource!.Response!.Model ? {
                'application/json': configSource!.Response!.Model
              } : undefined,
              responseParameters: methodResponseParameters
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
              statusCode: '500',
              responseParameters: methodResponseParameters
            }
          ]
        }
      });
    }
  }
}