import { IRestApi, RestApi } from '@aws-cdk/aws-apigateway';
import { AttributeType, ITable, Table } from '@aws-cdk/aws-dynamodb';
import { IFunction } from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { CfnOutput, RemovalPolicy } from '@aws-cdk/core';
import { BaseCrudApiProps } from './models';
import { GlobalCRUDResource } from './resources/global-resource';
import { IndividualCRUDResource } from './resources/individual-resource';

export class BaseCrudApi extends cdk.Construct {

  public readonly api: RestApi;
  public readonly table: ITable;
  public readonly backendFunction: IFunction;

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

    this.table = props.Table || new Table(this, 'EngagementsTable', {
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'Id',
        type: AttributeType.STRING
      }
    });

    // API resources
    
    const globalCrudResource = new GlobalCRUDResource(this, 'GlobalCRUDResource', {
      parent: props.GlobalParent || this.api.root,
      pathPart: props.ResourcePath,
      Configuration: {
        ...props,
        BackendFunction: this.backendFunction,
        Table: this.table
      }
      
    });

    const individualCrudResource = new IndividualCRUDResource(this, 'IndividualCRUDResource', {
      parent: props.IndividualParent || globalCrudResource,
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
