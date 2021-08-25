import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IRestApi, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, BillingMode, ITable, Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AssetCode, Function, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Aws, CfnOutput, Duration, Fn, RemovalPolicy } from 'aws-cdk-lib';
import { BaseCrudApiProps } from './models';
import { GlobalCRUDResource } from './resources/global-resource';
import { IndividualCRUDResource } from './resources/individual-resource';
import { Construct } from 'constructs';

export class BaseCrudApi extends Construct {

  public readonly api: RestApi;
  public readonly table: ITable;
  public readonly backendFunction: IFunction;

  public readonly globalResource: GlobalCRUDResource;
  public readonly individualResource: IndividualCRUDResource;

  constructor(scope: Construct, id: string, props: BaseCrudApiProps) {
    super(scope, id);

    const IotEndpointAddress = props.IotEndpointAddress;

    let teamMembershipsTable: ITable | undefined = props.TeamMembershipsTable;
    let teamResourcesTable: ITable | undefined = props.TeamResourcesTable;

    // Initialise the API
    this.api = props.Api!;
    //  || new RestApi(this, 'RestApi', {
    //   restApiName: props.ComponentName,
    //   defaultCorsPreflightOptions: {
    //     allowOrigins: ['*'],
    //     allowCredentials: true,
    //     allowHeaders: ['*'],
    //     allowMethods: ['*'],
    //   }
    // });

    this.table = props.Table || new Table(this, 'Table', {
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      partitionKey: {
        name: props.ParentResourceName ? props.ParentFieldName || 'ParentId' : props.IdFieldName || 'Id',
        type: AttributeType.STRING
      },
      sortKey: props.ParentResourceName ? {
        name: props.IdFieldName || 'Id',
        type: AttributeType.STRING
      } : undefined
    });

    // TODO: Add flag to limit this
    if (!props.Table) {
      const fullTable: Table = this.table as any;
      fullTable.addGlobalSecondaryIndex({
        indexName: 'ByUserId',
        partitionKey: {
          type: AttributeType.STRING,
          name: 'UserId'
        },
        sortKey: {
          type: AttributeType.STRING,
          name: 'Id'
        }
      });
    }

    this.backendFunction = props.BackendFunction || new Function(this, 'BackendFunction', {
      code: new AssetCode(`${__dirname}/../packages/standard-crud-backend`),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_12_X,
      description: `${props.ResourcePath} - Standard backend for CRUD apis`,
      memorySize: props.BackendMemory || 1024,
      timeout: props.BackendTimeout || Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        ITEMS_TABLE_NAME: this.table.tableName,
        ITEMS_BUCKET_NAME: props.Bucket ? props.Bucket.bucketName : '',
        ID_PARAM_NAME: props.IdResourceName || 'Id',
        PARENT_PARAM_NAME: props.ParentResourceName ? props.ParentFieldName || 'ParentId' : 'no',
        IOT_ENDPOINT_ADDRESS: IotEndpointAddress || 'none',

        TEAM_MEMBERSHIPS_TABLE_NAME: teamMembershipsTable?.tableName || 'none',
        TEAM_RESOURCES_TABLE_NAME: teamResourcesTable?.tableName || 'none',

        PIVOT_TABLE_NAME: props.Pivot ? props.Pivot!.Table.tableName : 'none'
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

      this.backendFunction.addToRolePolicy(new PolicyStatement({
        actions: [
          'iot:Publish'
        ],
        resources: [
          `arn:aws:iot:${Aws.REGION}:${Aws.ACCOUNT_ID}:topic/AfterSignals/events/*`
        ]
      }));

      if (teamMembershipsTable && teamResourcesTable) {
        this.backendFunction.addToRolePolicy(new PolicyStatement({
          actions: [
            'dynamodb:Query',
            'dynamodb:BatchGetItem'
          ],
          resources: [
            `${teamMembershipsTable.tableArn}/index/ByMemberId`,
            teamResourcesTable.tableArn
          ]
        }));
      }

      if (props.Pivot) {
        this.backendFunction.addToRolePolicy(new PolicyStatement({
          actions: [
            'dynamodb:GetItem',
            'dynamodb:BatchGetItem'
          ],
          resources: [
            props.Pivot!.Table.tableArn
          ]
        }))
      }
    }

    // Grant function access to bucket
    if (props.Bucket) {
      this.backendFunction.addToRolePolicy(new PolicyStatement({
        actions: [
          's3:PutObject',
          's3:GetObject',
          's3:DeleteObject'
        ],
        resources: [
          props.Bucket.bucketArn,
          props.Bucket.arnForObjects('*')
        ]
      }))
    }

    // API resources
    
    this.globalResource = new GlobalCRUDResource(this, 'GlobalCRUDResource', {
      parent: props.GlobalParent || this.api.root,
      pathPart: props.ResourcePath,
      Configuration: {
        ...props,
        BackendFunction: this.backendFunction,
        Table: this.table
      },
      Validator: props.Validator
    });

    this.individualResource = new IndividualCRUDResource(this, 'IndividualCRUDResource', {
      parent: props.IndividualParent || this.globalResource,
      pathPart: `{${props.IdResourceName || 'id'}}`,
      Configuration: {
        ...props,
        BackendFunction: this.backendFunction,
        Table: this.table,
      },
      Validator: props.Validator
    });

    new CfnOutput(this, 'AfterSignals::ComponentName', { value: this.api.restApiName });
    new CfnOutput(this, 'AfterSignals::ComponentType', { value: 'rest' });
    new CfnOutput(this, 'AfterSignals::EntryPoint', { value: this.api.url });
  }
}
