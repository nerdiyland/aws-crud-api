import { AuthorizationType, LambdaIntegration, Method, Model, PassthroughBehavior, RequestValidator, Resource, ResourceProps } from "@aws-cdk/aws-apigateway";
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
      this.createItemMethod = new Method(this, 'CreateItemMethod', {
        httpMethod: 'POST',
        resource: this,
        integration: new LambdaIntegration(props.Configuration.BackendFunction, {
          proxy: false,
          credentialsPassthrough: true,
          requestTemplates: {
            'application/json': JSON.stringify({
              UserId: '$context.identity.caller',
              TeamId: '$context.identity.cognitoIdentityPoolId',
              OperationName: 'createItem',
              Data: "'$input.json('$')'"
            }).split('"\'').join('').split('\'"').join('')
          },
          integrationResponses: [
            {
              statusCode: '200'
            }
          ],
          passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES
        }),
        options: {
          authorizationType: AuthorizationType.IAM,
          operationName: 'create',
          // requestModels: {
          //   'application/json': createRequestModel
          // },
          // TODO Response models
          requestValidator: requestValidator,
          methodResponses: [
            {
              statusCode: '200',
              // responseModels: {
              //   'application/json': entityPropsModel
              // },
            }
          ]
        }
      });
    }

    // List items
    if (props.Configuration.Operations.List) {
      this.listItemsMethod = new Method(this, 'ListItemsMethod', {
        httpMethod: 'GET',
        resource: this,
        integration: new LambdaIntegration(props.Configuration.BackendFunction, {
          proxy: false,
          credentialsPassthrough: true,
          requestTemplates: {
            'application/json': JSON.stringify({
              UserId: '$context.identity.caller',
              TeamId: '$context.identity.cognitoIdentityPoolId',
              OperationName: 'listItems',
              Data: "'$input.json('$')'" // TODO
            }).split('"\'').join('').split('\'"').join('')
          },
          integrationResponses: [
            {
              statusCode: '200'
            }
          ],
          passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES
        }),
        options: {
          authorizationType: AuthorizationType.IAM,
          operationName: 'listItems', // TODO 
          // FIXME
          // requestModels: {
          //   'application/json': listsRequestModel
          // },
          requestValidator: requestValidator,
          methodResponses: [
            {
              statusCode: '200',
              // responseModels: {
              //   'application/json': entityPropsModel
              // },
            }
          ]
        }
      });
    }
  }
}