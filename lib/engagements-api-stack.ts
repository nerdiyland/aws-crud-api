import { RestApi, JsonSchema } from '@aws-cdk/aws-apigateway';
import { EngagementGlobalCRUDResource } from './resources/engagements-crud/EngagementGlobalCRUDResource';
import { StackProps, CfnOutput, RemovalPolicy, Stack, Construct } from '@aws-cdk/core';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import { EngagementByIdCrudResource } from './resources/engagements-crud/EngagementByIdCrudResource';
import { ActionGlobalCRUDResource, ActionGlobalCrudResourceProps } from './resources/actions-crud/ActionGlobalCRUDResource';
import { ActionByIdCrudResource } from './resources/actions-crud/ActionByIdCrudResource';
import { ProspectGlobalCRUDResource } from './resources/prospects-crud/ProspectGlobalCRUDResource';
import { ProspectByIdCrudResource } from './resources/prospects-crud/ProspectByIdCrudResource';

export interface EngagementsApiProps extends StackProps {
  /**
   * Defines the environment that this API belongs to
   */
  EnvironmentName?: string;

  /**
   * Dereferenced schemas for the API
   */
  Schemas: JsonSchema;
}

/**
 * Defines the infrastructure required for the Engagements API to completely function.
 * This class relies on `@devax/models` package for defining the contracts for the API.
 * 
 * The engagements API shall contain all functionality of the tool in regards to data, files and reports storage and management. In essence, it's based on a combined DynamoDB/S3 storage, along with a DynamoDB table that stores all changes and actions performed to every engagement. These actions are only outlined here, and deeper feature documentation shall be found directly at the code.

 * General Features
 * 
 * * *Create engagement*: Engagements must be created through the API, that will populate all necessary fields and files for them.
 * * *Edit engagement*: Modify any of the parameters and flags for the engagement.
 * * *Delete engagement:* Remove an engagement from storage - or soft-delete it.
 * * *Archive engagement*: Stop considering this engagement active, and remove them from the current lists.
 * 
 * File Management
 * 
 * * *Upload file(s):* Add a series of files to an engagement, with optional tags to identify when such file was added - to identify the full context.
 * * *Delete file: *Remove a file from the engagement.
 * * *Other features for v1?*
 * 
 * Interaction Management
 * 
 * * *Create interaction: *Add an interaction held with a customer, with its corresponding [meta]data.
 * * *Edit interaction: *Modify the content of the interaction's report.
 * * *Delete interaction: *Remove the interaction from the engagement.
 * * *Add content: *Add a content reference to the interaction.
 * * *Remove content: *Remove a content reference from the interaction.
 * 
 * Report Management
 * 
 * * *Create report*: Create a report with the current data of the engagement.
 * * *Edit report: *Modify the content of a report.
 * * *Share report:* Share a read-only copy of this report.
 * * *Download report: *Download an offline copy of this report.
 * 
 * 
 */
export class EngagementsApiStack extends Stack {

  /**
   * Defines the REST API containing all functionality for engagement management
   */
  public readonly engagementsApi: RestApi;

  /**
   * Table that contains all engagements and their core information
   */
  public readonly engagementsTable: Table;

  /**
   * Table that stores the action log for all engagements
   */
  public readonly engagementActionsTable: Table;

  /**
   * DynamoDB table for storing the prospects for DevAx Engagements
   * - i.e. Engagement requests, onboarding.
   */
  public readonly prospectsTable: Table;

  constructor(scope: Construct, id: string, props: EngagementsApiProps) {
    super(scope, id, props);

    // Initialise the API
    this.engagementsApi = new RestApi(this, 'RestApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowCredentials: true,
        allowHeaders: ['*'],
        allowMethods: ['*'],
      }
    });

    this.engagementsTable = new Table(this, 'EngagementsTable', {
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'Id',
        type: AttributeType.STRING
      }
    });

    this.engagementActionsTable = new Table(this, 'EngagementActionsTable', {
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'EngagementId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'Id',
        type: AttributeType.STRING
      }
    });

    this.prospectsTable = new Table(this, 'PropsectsTable', {
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'Id',
        type: AttributeType.STRING
      }
    });

    // API resources
    
    // /engagements
    const engagementsGlobalCrud = new EngagementGlobalCRUDResource(this, 'EngagementsCRUD', {
      parent: this.engagementsApi.root,
      pathPart: 'engagements',
      engagementsTable: this.engagementsTable,
      Schemas: props.Schemas
    });

    // /engagements/${engagementId}
    const engagementsByIdCrud = new EngagementByIdCrudResource(this, 'EngagementByIdCRUD', {
      parent: engagementsGlobalCrud,
      pathPart: '{engagementId}',
      engagementsTable: this.engagementsTable,
      handlerFunction: engagementsGlobalCrud.apiBackendFunction,
      Schemas: props.Schemas
    });

    // /engagements/${engagementId}/actions
    const actionsGlobalCrud = new ActionGlobalCRUDResource(this, 'ActionsCRUD', {
      parent: engagementsByIdCrud,
      pathPart: 'actions',
      actionsTable: this.engagementActionsTable,
      Schemas: props.Schemas
    });

    // /engagements/${engagementId}/actions/${actionId}
    const actionByIdCrud = new ActionByIdCrudResource(this, 'ActionByIdCRUD', {
      parent: actionsGlobalCrud,
      pathPart: '{actionId}',
      actionsTable: this.engagementActionsTable,
      handlerFunction: actionsGlobalCrud.apiBackendFunction,
      Schemas: props.Schemas
    });

    // /prospects
    const prospectsGlobalCrud = new ProspectGlobalCRUDResource(this, 'ProspectsCRUD', {
      parent: this.engagementsApi.root,
      pathPart: 'prospects',
      prospectsTable: this.prospectsTable,
      Schemas: props.Schemas
    });

    // /prospects/${prospectId}
    const prospectsByIdCrud = new ProspectByIdCrudResource(this, 'ProspectByIdCRUD', {
      parent: prospectsGlobalCrud,
      pathPart: '{prospectId}',
      prospectsTable: this.prospectsTable,
      handlerFunction: prospectsGlobalCrud.apiBackendFunction,
      Schemas: props.Schemas
    });

    new CfnOutput(this, 'DevAx::PackageName', { value: 'EngagementsApi' });
    new CfnOutput(this, 'DevAx::PackageType', { value: 'rest' });
    new CfnOutput(this, 'DevAx::EnvironmentName', { value: props?.EnvironmentName || 'UNKNOWN' });
    new CfnOutput(this, 'DevAx::EntryPoint', { value: this.engagementsApi.url });
  }
}
