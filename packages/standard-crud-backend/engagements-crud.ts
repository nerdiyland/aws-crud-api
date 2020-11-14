import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { v4 as uuid } from 'uuid';
import { CreateEngagementRequest } from '@devax/models/dist/engagements/io/CreateEngagementRequest';
import { EngagementProps } from '@devax/models/dist/engagements';
import moment from 'moment';
import { UpdateEngagementRequest } from '@devax/models/dist/engagements/io/UpdateEngagementRequest';

/**
 * Configures the Engagements CRUD service
 */
export interface EngagementsCrudProps {

  /**
   * Id of the team that the user requesting this operation belongs to
   */
  TeamId: string;

  /**
   * Identity ID of the user that is requesting this service instance
   */
  UserId: string;

  /**
   * Name of the DynamoDB table where the engagements are stored.
   */
  EngagementsTableName: string;

  /**
   * Optionally, provide the documentClient instance to use
   */
  DocumentClient?: DocumentClient;

  /**
   * Region where this service is deployed
   */
  AwsRegion?: string;
}

/**
 * This service handles the CRUD operations for Engagements.
 */
export class EngagementsCrud {

  /**
   * Thrown when a requested engagement is not found
   */
  static ENGAGEMENT_NOT_FOUND_EXCEPTION = new Error('The requested engagement was not found');

  /**
   * Thrown when no configuration is given to this service
   */
  static INVALID_CONFIGURATION_EXCEPTION = new Error('Invalid configuration provided');

  /**
   * Thrown when the input configuration does not include a value for `EngagementsTableName`
   */
  static NO_ENGAGEMENTS_TABLE_EXCEPTION = new Error('No value has been given for the `EngagementsTableName` property');

  /**
   * Thrown when invalid or no UserId is provided
   */
  static INVALID_USER_ID_EXCEPTION = new Error('Invalid value provided for `UserId`');

  /**
   * Thrown when an `EngagementId` is not provided
   */
  static INVALID_ENGAGEMENT_ID_EXCEPTION = new Error('Invalid `EngagementId` provided');

  /**
   * Thrown when invalid or no TeamId is provided
   */
  static INVALID_TEAM_ID_EXCEPTION = new Error('Invalid value provided for `TeamId`');

  /**
   * Thrown when a method receives an invalid request
   */
  static INVALID_REQUEST_OBJECT = new Error('Invalid request object provided');

  /**
   * Thrown when an update is requested with no changes
   */
  static NO_CHANGES_EXCEPTION = new Error('No changes were provided to the update request');

  /**
   * Service properties
   */
  private readonly props: EngagementsCrudProps;

  /**
   * Accessor for DynamoDB
   */
  private readonly ddb: DocumentClient;
  
  constructor(props: EngagementsCrudProps) {
    if (!props) {
      throw EngagementsCrud.INVALID_CONFIGURATION_EXCEPTION;
    }

    if (!props.UserId) {
      throw EngagementsCrud.INVALID_USER_ID_EXCEPTION;
    }

    if (!props.TeamId) {
      throw EngagementsCrud.INVALID_TEAM_ID_EXCEPTION;
    }

    if (!props.EngagementsTableName) {
      throw EngagementsCrud.NO_ENGAGEMENTS_TABLE_EXCEPTION;
    }

    this.props = props;
    this.ddb = props.DocumentClient || new DocumentClient({
      region: props.AwsRegion || process.env.AWS_REGION
    });
  }
  
  /**
   * Creates an engagement in the system, and fills the required information
   * @param request Input object to configure the engagement
   */
  async createEngagement(request: CreateEngagementRequest): Promise<EngagementProps> {
    if (!request) {
      throw EngagementsCrud.INVALID_REQUEST_OBJECT;
    }

    if (!request.CustomerName || !request.EngagementName || !request.Description) {
      throw EngagementsCrud.INVALID_REQUEST_OBJECT
    }

    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const Item: EngagementProps = {
      ...request,
      UserId: this.props.UserId,
      TeamId: this.props.TeamId,
      Id: uuid(),
      Stakeholders: [],
      CreatedAt: now,
      UpdatedAt: now
    }

    await this.ddb.put({
      TableName: this.props.EngagementsTableName,
      Item
    }).promise();

    return Item;
  }

  /**
   * Deletes an engagement from the database
   * @param engagementId The identifier of the engagement to delete
   */
  async deleteEngagement(engagementId: string): Promise<void> {
    if (!engagementId) {
      throw EngagementsCrud.INVALID_ENGAGEMENT_ID_EXCEPTION;
    }

    await this.ddb.delete({
      TableName: this.props.EngagementsTableName,
      Key: {
        Id: engagementId
      }
    }).promise();
  }

  /**
   * Retrieves the engagement identified by the provided ID.
   * @param engagementId Id of the engagement
   */
  async getEngagementById (engagementId: string): Promise<EngagementProps> {
    if (!engagementId) {
      throw EngagementsCrud.INVALID_ENGAGEMENT_ID_EXCEPTION;
    }

    const response = await this.ddb.get({
      TableName: this.props.EngagementsTableName,
      Key: {
        Id: engagementId
      }
    }).promise();

    if (!response.Item) {
      throw EngagementsCrud.ENGAGEMENT_NOT_FOUND_EXCEPTION;
    }

    return response.Item! as EngagementProps;
  }

  /**
   * Lists the existing engagements in the database
   */
  async listEngagements (): Promise<EngagementProps[]> {
    const engagements = await this.ddb.scan({
      TableName: this.props.EngagementsTableName
    }).promise();

    return engagements.Items! as EngagementProps[];
  }

  /**
   * Updates an engagement in the database with the provided changes
   * @param engagementId Identifier of the engagement to update
   * @param request Request object with the items to update
   */
  async updateEngagement(engagementId: string, request: UpdateEngagementRequest): Promise<EngagementProps> {
    if (!engagementId) {
      throw EngagementsCrud.INVALID_ENGAGEMENT_ID_EXCEPTION;
    }

    if (!request) {
      throw EngagementsCrud.INVALID_REQUEST_OBJECT;
    }

    const changedKeys = Object.keys(request);
    if (!changedKeys.length) {
      throw EngagementsCrud.NO_CHANGES_EXCEPTION;
    }

    const validProperties = ['EngagementName', 'CustomerName', 'Description', 'StartDate', 'ExpectedDuration', 'Geo', 'Segment', 'Stage', 'Type', 'LastStatusChangeDate', 'SalesforceOpportunity', 'Status'];
    if (changedKeys.filter(k => validProperties.indexOf(k) === -1).length) {
      throw EngagementsCrud.INVALID_REQUEST_OBJECT;
    }

    const requestObject: DocumentClient.UpdateItemInput = {
      TableName: this.props.EngagementsTableName,
      Key: {
        Id: engagementId
      },
      UpdateExpression: `set ${changedKeys.map(k => `#${k} = :${k}`).join(', ')}`.trim(),
      ExpressionAttributeNames: changedKeys.map(k => ({ [`#${k}`]: k })).reduce((t: any, i: any) => ({ ...t, ...i }), {}),
      ExpressionAttributeValues: changedKeys.map(k => ({ [`:${k}`]: (request as any)[k] })).reduce((t: any, i: any) => ({ ...t, ...i }), {})
    }

    await this.ddb.update(requestObject).promise();

    return await this.getEngagementById(engagementId);
  }
}