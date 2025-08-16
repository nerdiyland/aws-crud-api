import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { RestApi, Cors } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { BaseCrudApi } from '@nerdiyland/aws-crud-api-rest';

export class SimpleTasksApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create the main API Gateway
    const api = new RestApi(this, 'TasksApi', {
      restApiName: 'Simple Tasks API',
      description: 'A simple CRUD API for managing tasks',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token']
      }
    });

    // Create the CRUD API for tasks
    const tasksCrud = new BaseCrudApi(this, 'TasksCRUD', {
      EnvironmentName: 'dev',
      Api: api,
      ResourcePath: 'tasks',
      GlobalParent: api.root,
      Operations: {
        Create: {
          OperationName: 'createTask'
        },
        ListOwned: {
          IndexName: 'ByUserId',
          OperationName: 'listTasks'
        },
        Read: {
          OperationName: 'getTask'
        },
        Update: {
          OperationName: 'updateTask'
        },
        Delete: {
          OperationName: 'deleteTask'
        }
      }
    });

    // Output the API URL for easy access
    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL for the Tasks API'
    });

    new CfnOutput(this, 'TasksEndpoint', {
      value: `${api.url}tasks`,
      description: 'Full endpoint URL for tasks resource'
    });
  }
}
