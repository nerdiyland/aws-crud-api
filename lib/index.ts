import { RestApi } from '@aws-cdk/aws-apigateway';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import * as cdk from '@aws-cdk/core';
import { CfnOutput, RemovalPolicy } from '@aws-cdk/core';
import { BaseCrudApiProps } from './models';
import { GlobalCRUDResource } from './resources/global-resource';
import { IndividualCRUDResource } from './resources/individual-resource';

export class BaseCrudApi extends cdk.Construct {

  public readonly api: RestApi;
  public readonly table: Table;

  constructor(scope: cdk.Construct, id: string, props: BaseCrudApiProps) {
    super(scope, id);

    // Initialise the API
    this.api = new RestApi(this, 'RestApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowCredentials: true,
        allowHeaders: ['*'],
        allowMethods: ['*'],
      }
    });

    this.table = new Table(this, 'EngagementsTable', {
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'Id',
        type: AttributeType.STRING
      }
    });

    // API resources
    
    const globalCrudResource = new GlobalCRUDResource(this, 'GlobalCRUDResource', {
      parent: this.api.root,
      pathPart: props.GlobalPathPart,
      Configuration: {
        ...props,
        TableConfiguration: this.table
      }
      
    });

    const individualCrudResource = new IndividualCRUDResource(this, 'IndividualCRUDResource', {
      parent: globalCrudResource,
      pathPart: props.UniquePathPart,
      Configuration: {
        ...props,
        TableConfiguration: this.table
      }
    });

    new CfnOutput(this, 'AfterSignals::ComponentName', { value: props.ComponentName });
    new CfnOutput(this, 'AfterSignals::ComponentType', { value: 'rest' });
    new CfnOutput(this, 'AfterSignals::EntryPoint', { value: this.api.url });
  }
}
