import { AuthorizationType, LambdaIntegration, Method, MethodOptions, Model, PassthroughBehavior, RequestValidator, Resource, ResourceProps } from "@aws-cdk/aws-apigateway";
import { Construct } from "@aws-cdk/core";
import { ITable } from '@aws-cdk/aws-dynamodb';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { BaseCrudApiProps } from "../models";
import { IFunction } from "@aws-cdk/aws-lambda";

export interface ExtendedConfiguration extends BaseCrudApiProps {
  BackendFunction: IFunction;
  Table: ITable;
}

export interface ResourceConfiguration extends ResourceProps {
  Configuration: ExtendedConfiguration;
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

    const requestValidator = new RequestValidator(this, 'GlobalCrudRequestValidator', {
      restApi: this.api,
      validateRequestBody: true,
      validateRequestParameters: true
    });

    // TODO Define models
    
    // Create item
    if(props.Configuration.Operations.Create) {
      let inputModel: Model;
      
      const createMethodOptions: MethodOptions = {
        authorizationType: AuthorizationType.IAM,
        operationName: props.Configuration.Operations.Create!.OperationName,
        // TODO Response models
        requestValidator: requestValidator,
        methodResponses: [
          {
            statusCode: '200',
            // responseModels: {
            //   'application/json': entityPropsModel
            // },
            responseParameters: {
              'method.response.header.access-control-allow-origin': true,
              'method.response.header.access-control-allow-headers': true,
              'method.response.header.access-control-allow-methods': true,
              'method.response.header.access-control-allow-credentials': true
            }
          }
        ]
      };
        
      if (props.Configuration.Operations.Create!.InputModel) {
        // @ts-ignore
        createMethodOptions.requestModels = {
          'application/json': props.Configuration.Operations.Create!.InputModel
        }
      }
      
      if (props.Configuration.ParentResourceName) {

        // @ts-ignore
        createMethodOptions.requestParameters = {
          [`method.request.path.${props.Configuration.ParentResourceName || 'parentId'}`]: !!props.Configuration.ParentResourceName
        }
      }

      const fn = props.Configuration.Operations.Create.BackendFunction || props.Configuration.BackendFunction;
      this.createItemMethod = new Method(this, 'CreateItemMethod', {
        httpMethod: 'POST',
        resource: this,
        integration: new LambdaIntegration(fn, {
          proxy: false,
          credentialsPassthrough: true,
          requestParameters: !!props.Configuration.ParentResourceName ? {
            'integration.request.path.parentId': `method.request.path.${props.Configuration.ParentResourceName}`
          } : undefined,
          requestTemplates: {
            'application/json': JSON.stringify({
              Params: {
                UserId: '$context.identity.cognitoIdentityId',
                OperationName: 'createItem',
                EntitySchema: props.Configuration.EntitySchema,
                IdFieldName: props.Configuration.IdFieldName,
                ParentFieldName: props.Configuration.ParentFieldName,
                OutputFields: (props.Configuration.Operations.Create!.Response! || {}).Fields,
                ParentId: `$input.params('parentId')`
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
          credentialsPassthrough: true,
          requestTemplates: {
            'application/json': JSON.stringify({
              Params: {
                UserId: '$context.identity.cognitoIdentityId',
                OperationName: 'listItems',
                ListType: listType,
                IndexName: configSource!.IndexName,
                EntitySchema: props.Configuration.EntitySchema,
                IdFieldName: props.Configuration.IdFieldName,
                ParentFieldName: props.Configuration.ParentFieldName,
                ParentId: `$input.params('${props.Configuration.ParentResourceName}')`
              },
              Data: "'$input.json('$')'" // TODO
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
          requestValidator: requestValidator,
          methodResponses: [
            {
              statusCode: '200',
              // responseModels: {
              //   'application/json': entityPropsModel
              // },
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
  }
}