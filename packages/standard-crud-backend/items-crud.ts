import { TeamMember, TeamResource } from '@aftersignals/models/customers';
import { BaseCrudApiOperationSecurityConfiguration } from './../../lib/models/index';
import { DocumentClient, QueryOutput, ScanOutput } from 'aws-sdk/clients/dynamodb';
import S3 from 'aws-sdk/clients/s3';
import { v4 as uuid } from 'uuid';
import moment from 'moment';
import { StandaloneObject } from '@aftersignals/models/base/StandaloneObject';
import { CreateItemRequest } from '@aftersignals/models/apis/base/contracts/CreateItemRequest'
import { ListItemsRequest } from '@aftersignals/models/apis/base/contracts/ListItemsRequest'
import { ListItemsResponse } from '@aftersignals/models/apis/base/contracts/ListItemsResponse'
import { ExtendedJSONSchema } from '@aftersignals/models/base/ExtendedSchema'
import { Scaffold } from '@aftersignals/models/util/scaffold';
import Log from '@dazn/lambda-powertools-logger';
import Schemas from '@aftersignals/models/schema.extended.json';
import path from 'path';

/**
 * Configures the Items CRUD service
 */
export interface ItemsCrudProps {

  /**
   * Identity ID of the user that is requesting this service instance
   */
  UserId: string;

  /**
   * Name of the DynamoDB table where the items are stored.
   */
  ItemsTableName: string;

  /**
   * Name of the S3 bucket that handles large data
   */
  ItemsBucketName?: string;

  /**
   * Optionally, provide the documentClient instance to use
   */
  DocumentClient?: DocumentClient;

  /**
   * Region where this service is deployed
   */
  AwsRegion?: string;

  /**
   * Name of the field that this entity's management uses as identifier. `Id` is used by default
   */
  IdFieldName?: string;

  /**
   * If the entity has a parent, name of the identifier of such parent in the entity's model
   */
  ParentFieldName?: string;

  /**
   * Schema used by `create` operations to define the required initial data
   */
  InputSchema?: ExtendedJSONSchema;

  /**
   * Schema used by the entity that this API manages. If none is defined, the `CreateInputSchema` is used to define objects
   */
  EntitySchema?: ExtendedJSONSchema;

  /**
   * ID of the parent of this entity, if any
   */
  ParentId?: string;

  /**
   * Table alias to use
   */
  IndexName?: string;

  /**
   * Type of list operation
   */
  ListType?: 'global' | 'owned';

  OutputFields?: string[];

  S3Fields?: { [key: string]: any },

  Security?: BaseCrudApiOperationSecurityConfiguration;

  TeamMembershipsTableName?: string;

  TeamResourcesTableName?: string;
}

/**
 * This service handles the CRUD operations for Items.
 * Generic items:
 * * C: Creation request object
 * * R: Item
 * * U: Update request object: Update request object
 * * D: Delete request objects - also used for get requests and update requests.
 * * L: List filtering request
 */
export class ItemsCrud<C extends CreateItemRequest, R extends StandaloneObject, U, D, L> {

  /**
   * Thrown when a requested item is not found
   */
  static ITEM_NOT_FOUND_EXCEPTION = new Error('The requested item was not found');

  /**
   * Thrown when no configuration is given to this service
   */
  static INVALID_CONFIGURATION_EXCEPTION = new Error('Invalid configuration provided');

  /**
   * Thrown when the input configuration does not include a value for `ItemsTableName`
   */
  static NO_ITEMS_TABLE_EXCEPTION = new Error('No value has been given for the `ItemsTableName` property');

  /**
   * Thrown when invalid or no UserId is provided
   */
  static INVALID_USER_ID_EXCEPTION = new Error('Invalid value provided for `UserId`');

  /**
   * Thrown when an `ItemId` is not provided
   */
  static INVALID_ITEM_ID_EXCEPTION = new Error('Invalid `ItemId` provided');

  /**
   * Thrown when a method receives an invalid request
   */
  static INVALID_REQUEST_OBJECT = new Error('Invalid request object provided');

  /**
   * Thrown when an update is requested with no changes
   */
  static NO_CHANGES_EXCEPTION = new Error('No changes were provided to the update request');

  static UNAUTHORIZED_EXCEPTION = new Error('Unauthorized');

  /**
   * Service properties
   */
  private readonly props: ItemsCrudProps;

  /**
   * Accessor for DynamoDB
   */
  private readonly ddb: DocumentClient;

  /**
   * Accessor for S3
   */
  private readonly s3: S3;

  /**
   * Stores user teams
   */
  private userTeams: string[] = [];

  /**
   * Stores identifiers of resources managed by user teams
   */
  private userTeamsResources: string[] = [];

  
  constructor(props: ItemsCrudProps) {
    if (!props) {
      throw ItemsCrud.INVALID_CONFIGURATION_EXCEPTION;
    }

    if (!props.UserId) {
      throw ItemsCrud.INVALID_USER_ID_EXCEPTION;
    }

    if (!props.ItemsTableName) {
      throw ItemsCrud.NO_ITEMS_TABLE_EXCEPTION;
    }

    this.props = props;
    this.ddb = props.DocumentClient || new DocumentClient({
      region: props.AwsRegion || process.env.AWS_REGION
    });

    this.s3 = new S3({
      region: props.AwsRegion || process.env.AWS_REGION
    })
  }
  
  /**
   * Creates an item in the system, and fills the required information
   * @param request Input object to configure the item
   */
  async createItem(request: C): Promise<C> {
    if (!request) {
      throw ItemsCrud.INVALID_REQUEST_OBJECT;
    }

    // If an ID is given, update instead
    const requestId = (request as any)[this.props.IdFieldName || 'Id'];
    if (!!requestId) {
      Log.warn('Requested Creation, but this is actually an update. Redirecting')
      return await this.updateItem(requestId, request as any) as any;
    }

    // TODO Validate model
    const schema: ExtendedJSONSchema = (this.props.InputSchema || Schemas.definitions.CreateItemRequest) as any;
    const scaffold = new Scaffold(schema, { 
      ...request, 
      UserId: this.props.UserId
    });
    const Item: any = scaffold.data;

    // Add parentId to object
    if (this.props.ParentFieldName) {
      const parentId = this.props.ParentId!;
      Item[this.props.ParentFieldName] = parentId;
    }

    // Manage S3 Fields
    let finalRequest: any = Item;
    if (this.props.S3Fields) {
      const s3KeyNames = Object.keys(this.props.S3Fields!);
      Log.info('Managing S3 fields', { fields: s3KeyNames });

      const s3Keys = await Promise.all(s3KeyNames.map(async (s3Key: any) => {
        const s3KeyValue = this.props.S3Fields![s3Key];
        const key = path.join(`${s3KeyValue.Prefix || ''}`, this.props.UserId, (Item as any)[this.props.IdFieldName || 'Id']!, `${s3Key}`);
        const contents = (finalRequest as any)[s3Key];
        if (contents !== undefined) {
          const strContents = typeof(contents) === 'object' ? JSON.stringify(contents) : contents;

          const s3Response = await this.s3.putObject({
            Bucket: this.props.ItemsBucketName!,
            Key: key,
            Body: strContents,
            // ServerSideEncryption: 'aws:kms',
            // TODO Configure encryption and more
          }).promise();

          return { [s3Key]: key }
        }
        
        return {};
      }));

      const objectReplacement = s3Keys.reduce((t, i) => ({ ...t, ...i }), {});
      finalRequest = {
        ...finalRequest,
        ...objectReplacement
      }
    }

    await this.ddb.put({
      TableName: this.props.ItemsTableName,
      Item: finalRequest
    }).promise();

    return Item;
  }

  /**
   * Deletes an item from the database
   * @param itemId The identifier of the item to delete
   */
  async deleteItem(itemId: string): Promise<void> {
    if (!itemId) {
      throw ItemsCrud.INVALID_ITEM_ID_EXCEPTION;
    }

    const idField = this.props.IdFieldName || 'Id';
    const parentField = this.props.ParentFieldName;
    const parentId = this.props.ParentId;

    const Key = {};

    if (parentField) {
      (Key as any)[parentField] = parentId;
    }

    (Key as any)[idField] = itemId;

    // Get item first
    const item = await this.getItemById(itemId, parentId);
    // Validate item security
    const isAuthorized = await this.verifyItemSecurity(item);
    if (!isAuthorized) {
      throw ItemsCrud.UNAUTHORIZED_EXCEPTION;
    }

    Log.debug('Delete item request', {
      Key
    });

    await this.ddb.delete({
      TableName: this.props.ItemsTableName,
      Key: {
        Id: itemId
      }
    }).promise();
  }

  /**
   * Retrieves the item identified by the provided ID.
   * @param itemId Id of the item
   */
  async getItemById (itemId: string, parentId?: string): Promise<R> {
    if (!itemId) {
      throw ItemsCrud.INVALID_ITEM_ID_EXCEPTION;
    }
    
    const idField = this.props.IdFieldName || 'Id';
    const parentField = this.props.ParentFieldName;
    
    if (!parentId) {
      parentId = this.props.ParentId;
    }

    const Key = {};

    if (parentField) {
      (Key as any)[parentField] = parentId;
    }

    (Key as any)[idField] = itemId;

    Log.info('Getting element by Id', { Key, TableName: this.props.ItemsTableName });

    const response = await this.ddb.get({
      TableName: this.props.ItemsTableName,
      Key
    }).promise();

    if (!response.Item) {
      throw ItemsCrud.ITEM_NOT_FOUND_EXCEPTION;
    }

    // Verify ownership of object
    // It's a 403, but show a 404 as user doesn't need to know whether the object exists.
    let responseItem = response.Item!;
    const isAuthorizedForItem = await this.verifyItemSecurity(responseItem);
    if (!isAuthorizedForItem) {
      throw ItemsCrud.ITEM_NOT_FOUND_EXCEPTION;
    }

    // Manage S3 Fields
    if (this.props.S3Fields) {
      const s3KeyNames = Object.keys(this.props.S3Fields!);
      Log.info('Managing S3 fields', { fields: s3KeyNames });

      try {
        const s3Keys = await Promise.all(s3KeyNames.map(async (s3Key: any) => {
          const s3KeyValue = this.props.S3Fields![s3Key];
          const objectKey = responseItem[s3Key];
          const contents = await this.s3.getObject({
            Bucket: this.props.ItemsBucketName!,
            Key: objectKey
          }).promise();

          let parsedContents = contents.Body!.toString('utf-8');
          switch (s3KeyValue.DataFormat) {
            case 'json':
            case undefined:
            default:
              parsedContents = JSON.parse(parsedContents);
              break;
            // TODO Allow for other data rather than just JSON
          }
          return { [s3Key]: parsedContents };
        }));

        const replacements = s3Keys.reduce((t, i) => ({ ...t, ...i }), {});
        responseItem = {
          ...responseItem,
          ...replacements
        }
      } catch (e) {
        // TODO DElete this shit
      }
    }

    // Apply field level security
    const mappedItem = await this.applyFieldLevelSecurity(responseItem);

    return mappedItem as R;
  }

  /**
   * Lists the existing items in the database
   */
  async listItems (request?: ListItemsRequest<L>): Promise<ListItemsResponse<R>> {
    
    // TODO Paging in

    let items: QueryOutput | ScanOutput;
    if (this.props.ListType === 'owned') {
      Log.info('Fetching owned items', { UserId: this.props.UserId, IndexName: this.props.IndexName, });
      items = await this.ddb.query({
        TableName: this.props.ItemsTableName,
        IndexName: this.props.IndexName,
        KeyConditionExpression: '#userId = :userId',
        ExpressionAttributeNames: {
          '#userId': this.props.ParentFieldName || 'UserId'
        },
        ExpressionAttributeValues: {
          ':userId': this.props.UserId
        }
      }).promise();
      
      
    }
    else if (this.props.ParentFieldName !== undefined) {
      Log.info('Fetching items by ParentId', { 
        ParentId: this.props.ParentId, 
        ParentIdField: this.props.ParentFieldName,
        IndexName: this.props.IndexName,
      });
      
      items = await this.ddb.query({
        TableName: this.props.ItemsTableName,
        IndexName: this.props.IndexName,
        KeyConditionExpression: '#parentId = :parentId',
        ExpressionAttributeNames: {
          '#parentId': this.props.ParentFieldName!
        },
        ExpressionAttributeValues: {
          ':parentId': this.props.ParentId
        }
      }).promise();
    } else {
      Log.info('Scanning items');
      items = await this.ddb.scan({
        TableName: this.props.ItemsTableName
      }).promise();
    }

    // Manage operation security
    Log.debug('Managing item security', { OriginalListCount: items.Items!.length })
    let filteredItems = [];
    switch (this.props.ListType) {
      case 'owned':
        filteredItems = items.Items!;
        // Security here is handled by default. Only owned items will be fetched.
        break;
      default:
        // Filter items by security configuration
        filteredItems = await Promise.all(items.Items!.filter(async (item: StandaloneObject) => await this.verifyItemSecurity(item)));
    }

    // Parse field-level security
    Log.debug('Applying field-level security', { FilteredListCount: filteredItems.length });
    let mappedItems = await Promise.all(filteredItems.map(async (item: StandaloneObject) => await this.applyFieldLevelSecurity(item)));

    // TODO Paging out

    Log.debug('Handing response to client');
    return mappedItems as any;
  }

  /**
   * Updates an item in the database with the provided changes
   * @param itemId Identifier of the item to update
   * @param request Request object with the items to update
   */
  async updateItem(itemId: string, request: U): Promise<R> {
    if (!itemId) {
      throw ItemsCrud.INVALID_ITEM_ID_EXCEPTION;
    }

    if (!request) {
      throw ItemsCrud.INVALID_REQUEST_OBJECT;
    }

    const idField = this.props.IdFieldName || 'Id';
    const parentField = this.props.ParentFieldName;
    
    const parentId = this.props.ParentId;

    const Key = {
      ...(!parentField ? {} : { [parentField]: parentId }),
      [idField]: itemId
    };
    
    delete (request as any)[idField];

    // Delete CreatedAt, DeletedAt && UserId
    delete (request as any).CreatedAt;
    delete (request as any).DeletedAt;
    delete (request as any).UserId;

    if (parentField) delete (request as any)[parentField];
    (request as any).UpdatedAt = new Date().toISOString();

    // Update updated date
    // TODO Do this better
    (request as any).UpdatedAt = new Date().toISOString();

    // Get item first
    const originalItem = await this.getItemById(itemId, parentId);
    const isAuthorized = await this.verifyItemSecurity(originalItem);
    if (!isAuthorized) {
      throw ItemsCrud.UNAUTHORIZED_EXCEPTION;
    }

    // Apply field-level permissions to change request
    const mappedRequest = await this.applyFieldLevelSecurity(request);

    const changedKeys = Object.keys(mappedRequest);
    if (changedKeys.length === 1) {
      throw ItemsCrud.NO_CHANGES_EXCEPTION;
    }

    // Manage S3 Fields
    let finalRequest: any = mappedRequest;
    if (this.props.S3Fields) {
      const s3KeyNames = Object.keys(this.props.S3Fields!);
      Log.info('Managing S3 fields', { fields: s3KeyNames });

      const s3Keys = await Promise.all(s3KeyNames.map(async (s3Key: any) => {
        const s3KeyValue = this.props.S3Fields![s3Key];
        const key = path.join(`${s3KeyValue.Prefix || ''}`, this.props.UserId, itemId, `${s3Key}`);
        const contents = (mappedRequest as any)[s3Key];
        const strContents = typeof(contents) === 'object' ? JSON.stringify(contents) : contents;

        const s3Response = await this.s3.putObject({
          Bucket: this.props.ItemsBucketName!,
          Key: key,
          Body: strContents,
          // ServerSideEncryption: 'aws:kms',
          // TODO Configure encryption and more
        }).promise();

        return { [s3Key]: key }
      }));

      const objectReplacement = s3Keys.reduce((t, i) => ({ ...t, ...i }), {});
      finalRequest = {
        ...finalRequest,
        ...objectReplacement
      }
    }

    const requestObject: DocumentClient.UpdateItemInput = {
      TableName: this.props.ItemsTableName,
      Key,
      UpdateExpression: `set ${changedKeys.map(k => `#${k} = :${k}`).join(', ')}`.trim(),
      ExpressionAttributeNames: changedKeys.map(k => ({ [`#${k}`]: k })).reduce((t: any, i: any) => ({ ...t, ...i }), {}),
      ExpressionAttributeValues: changedKeys.map(k => ({ [`:${k}`]: finalRequest[k] })).reduce((t: any, i: any) => ({ ...t, ...i }), {})
    }

    Log.info('Updating object', { 
      Key, 
      UpdateExpression: requestObject.UpdateExpression,
      TableName: this.props.ItemsTableName
    });

    await this.ddb.update(requestObject).promise();

    return await this.getItemById(itemId, parentId);
  }

  private async applyFieldLevelSecurity (item: StandaloneObject) {
    const itemOwner = item.UserId!;

    // TODO Manage team stuff
    let securityToApply: 'Owner' | 'Public' = itemOwner === this.props.UserId ? 'Owner' : 'Public';

    const security = ((this.props.Security || {})[securityToApply]) || {};
    const fields = (security.Fields || Object.keys(item));
    
    // TODO Manage sub-field permissions
    return fields.reduce((ret, field) => ({ ...ret, [field]: (item as any)[field]}), {})
  }

  private async verifyItemSecurity (item: StandaloneObject): Promise<boolean> {
    const itemOwner = item.UserId!;

    // TODO Manage team stuff
    let securityToApply: 'Owner' | 'Public' = itemOwner === this.props.UserId ? 'Owner' : 'Public';
    if (securityToApply === 'Public' && this.props.Security && this.props.Security!.Team) {
      Log.info('Finding user teams and resources');
      const userTeamsResponse = await this.ddb.query({
        TableName: this.props.TeamMembershipsTableName!,
        IndexName: 'ByMemberId',
        KeyConditionExpression: '#userId = :userId',
        ExpressionAttributeNames: {
          '#userId': 'MemberId',
        },
        ExpressionAttributeValues: {
          ':userId': this.props.UserId
        }
      }).promise();

      const userTeams: TeamMember[] = userTeamsResponse.Items! as any[];
      this.userTeams = userTeams.map((t: any) => t.TeamId!);
      Log.info('Fetching team resource information', { Teams: this.userTeams });

      const teamResourceRequest = {
        RequestItems: {
          [this.props.TeamResourcesTableName!]: {
            Keys: userTeams.map((team: TeamMember) => team.Id!)
            .map((TeamId: string) => ({
              TeamId,
              Id: item.Id!
            }))
          }
        }
      }

      const teamResourcesResponse = await this.ddb.batchGet(teamResourceRequest).promise();
      const teamResources = Object.values(teamResourcesResponse.Responses!);
      if (teamResources.length) return true;

      Log.error('This is not a team resource', { UserId: this.props.UserId, ResourceId: item.Id! });
    }

    const security = (this.props.Security || {})[securityToApply];
    if (!security) {

      // FIXME To keep things working, we'll allow owners to fetch their items
      // Even if no security was set o the api.
      if (securityToApply === 'Owner') return true;

      return false;
    }

    return true;
  }
}