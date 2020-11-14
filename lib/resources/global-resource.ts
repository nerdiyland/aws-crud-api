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
  public readonly createMethod: Method;

  /**
   * Method for listing entities
   */
  public readonly listsMethod: Method;

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
    
    // Create entity
    this.createMethod = new Method(this, 'CreateMethod', {
      httpMethod: 'POST',
      resource: this,
      integration: new LambdaIntegration(props.Configuration.BackendFunction, {
        proxy: false,
        credentialsPassthrough: true,
        requestTemplates: {
          'application/json': JSON.stringify({
            UserId: '$context.identity.caller',
            TeamId: '$context.identity.cognitoIdentityPoolId',
            OperationName: 'create',
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

    // List entities
    this.listsMethod = new Method(this, 'ListsMethod', {
      httpMethod: 'GET',
      resource: this,
      integration: new LambdaIntegration(props.Configuration.BackendFunction, {
        proxy: false,
        credentialsPassthrough: true,
        requestTemplates: {
          'application/json': JSON.stringify({
            UserId: '$context.identity.caller',
            TeamId: '$context.identity.cognitoIdentityPoolId',
            OperationName: 'lists',
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
        operationName: 'lists',
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