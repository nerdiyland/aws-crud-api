import { IRestApi, RestApi } from '@aws-cdk/aws-apigateway';
import { AttributeType, BillingMode, ITable, Table } from '@aws-cdk/aws-dynamodb';
import { PolicyStatement, ServicePrincipal } from '@aws-cdk/aws-iam';
import { AssetCode, Function, IFunction, Runtime } from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { Aws, CfnOutput, RemovalPolicy, ResourceEnvironment } from '@aws-cdk/core';
import { BaseCrudApiProps } from './models';
import { GlobalCRUDResource } from './resources/global-resource';
import { IndividualCRUDResource } from './resources/individual-resource';

export class BaseCrudApi extends cdk.Construct {

  public readonly api: RestApi;
  public readonly table: ITable;
  public readonly backendFunction: IFunction;

  public readonly globalResource: GlobalCRUDResource;
  public readonly individualResource: IndividualCRUDResource;

  constructor(scope: cdk.Construct, id: string, props: BaseCrudApiProps) {
    super(scope, id);

    // Initialise the API
    this.api = props.Api || new RestApi(this, 'RestApi', {
      restApiName: props.ComponentName,
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowCredentials: true,
        allowHeaders: ['*'],
        allowMethods: ['*'],
      }
    });

    this.table = props.Table || new Table(this, 'Table', {
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'Id',
        type: AttributeType.STRING
      }
    });

    this.backendFunction = props.BackendFunction || new Function(this, 'BackendFunction', {
      code: new AssetCode(`${__dirname}/../packages/standard-crud-backend`),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_12_X,
      description: `${props.ComponentName}/${props.ResourcePath} - Standard backend for CRUD apis`,
      environment: {
        ITEMS_TABLE_NAME: this.table.tableName
      }
    });

    this.backendFunction.addPermission('ApiInvoke', {
      principal: new ServicePrincipal('apigateway.amazon.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${Aws.REGION}:${Aws.ACCOUNT_ID}:${this.api.restApiId}/*`
    });

    if (!props.BackendFunction) {
      this.backendFunction.addToRolePolicy(new PolicyStatement({
        actions: [
          'dynamodb:GetItem',
          'dynamodb:Query',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteIte',
          'dynamodb:PutItem'
        ],
        resources: [
          this.table.tableArn
        ]
      }));
    }

    // API resources
    
    this.globalResource = new GlobalCRUDResource(this, 'GlobalCRUDResource', {
      parent: props.GlobalParent || this.api.root,
      pathPart: props.ResourcePath,
      Configuration: {
        ...props,
        BackendFunction: this.backendFunction,
        Table: this.table
      }
    });

    this.individualResource = new IndividualCRUDResource(this, 'IndividualCRUDResource', {
      parent: props.IndividualParent || this.globalResource,
      pathPart: `{id}`,
      Configuration: {
        ...props,
        BackendFunction: this.backendFunction,
        Table: this.table
      }
    });

    new CfnOutput(this, 'AfterSignals::ComponentName', { value: props.ComponentName });
    new CfnOutput(this, 'AfterSignals::ComponentType', { value: 'rest' });
    new CfnOutput(this, 'AfterSignals::EntryPoint', { value: this.api.url });
  }
}
