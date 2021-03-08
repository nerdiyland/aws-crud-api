import { RetentionDays } from '@aws-cdk/aws-logs';
import { IRestApi, RestApi } from '@aws-cdk/aws-apigateway';
import { AttributeType, BillingMode, ITable, Table } from '@aws-cdk/aws-dynamodb';
import { PolicyStatement, ServicePrincipal } from '@aws-cdk/aws-iam';
import { AssetCode, Function, IFunction, Runtime } from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { Aws, CfnOutput, RemovalPolicy } from '@aws-cdk/core';
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
        name: props.ParentResourceName ? props.ParentFieldName || 'ParentId' : props.IdFieldName || 'Id',
        type: AttributeType.STRING
      },
      sortKey: props.ParentResourceName ? {
        name: props.IdFieldName || 'Id',
        type: AttributeType.STRING
      } : undefined
    });

    this.backendFunction = props.BackendFunction || new Function(this, 'BackendFunction', {
      code: new AssetCode(`${__dirname}/../packages/standard-crud-backend`),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_12_X,
      description: `${props.ComponentName}/${props.ResourcePath} - Standard backend for CRUD apis`,
      logRetention: RetentionDays.ONE_WEEK,
      memorySize: props.BackendMemory,
      timeout: props.BackendTimeout,
      environment: {
        ITEMS_TABLE_NAME: this.table.tableName,
        ID_PARAM_NAME: props.IdResourceName || 'Id',
        PARENT_PARAM_NAME: props.ParentResourceName ? props.ParentFieldName || 'ParentId' : 'no'
      }
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
      pathPart: `{${props.IdResourceName || 'id'}}`,
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
