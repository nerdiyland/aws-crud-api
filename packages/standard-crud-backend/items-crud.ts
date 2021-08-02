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

    // TODO Validate model
    const schema: ExtendedJSONSchema = (this.props.InputSchema || Schemas.definitions.CreateItemRequest) as any;
    const scaffold = new Scaffold(schema, { 
      ...request, 
      UserId: this.props.UserId,
    });
    const Item: C = scaffold.data;

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

    // Manage S3 Fields
    let responseItem = response.Item!;
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

    return responseItem as R;
  }

  /**
   * Lists the existing items in the database
   */
  async listItems (request?: ListItemsRequest<L>): Promise<ListItemsResponse<R>> {
    
    // TODO Paging in

    let items: QueryOutput | ScanOutput;
    if (this.props.ListType === 'owned') {
      Log.info('Fetching owned items', { UserId: this.props.UserId });
      items = await this.ddb.query({
        TableName: this.props.ItemsTableName,
        IndexName: this.props.IndexName,
        KeyConditionExpression: '#userId = :userId',
        ExpressionAttributeNames: {
          '#userId': 'UserId'
        },
        ExpressionAttributeValues: {
          ':userId': this.props.UserId
        }
      }).promise();
    }
    else if (this.props.ParentFieldName !== undefined) {
      Log.info('Fetching items by ParentId', { ParentId: this.props.ParentId, ParentIdField: this.props.ParentFieldName });
      items = await this.ddb.query({
        TableName: this.props.ItemsTableName,
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

    // TODO Paging out

    return items.Items! as any;
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

    // TODO Test this
    const idField = this.props.IdFieldName || 'Id';
    const parentField = this.props.ParentFieldName;

    let parent = parentField ? (request as any)[parentField] : undefined;
    
    delete (request as any)[idField];

    // Delete CreatedAt, DeletedAt && UserId
    delete (request as any).CreatedAt;
    delete (request as any).DeletedAt;
    delete (request as any).UserId;

    if (parentField) delete (request as any)[parentField];

    (request as any).UpdatedAt = new Date().toISOString();
    const changedKeys = Object.keys(request);
    if (changedKeys.length === 1) {
      throw ItemsCrud.NO_CHANGES_EXCEPTION;
    }

    // Update updated date
    // TODO Do this better
    (request as any).UpdatedAt = new Date().toISOString();

    // Manage S3 Fields
    let finalRequest: any = request;
    if (this.props.S3Fields) {
      const s3KeyNames = Object.keys(this.props.S3Fields!);
      Log.info('Managing S3 fields', { fields: s3KeyNames });

      const s3Keys = await Promise.all(s3KeyNames.map(async (s3Key: any) => {
        const s3KeyValue = this.props.S3Fields![s3Key];
        const key = path.join(`${s3KeyValue.Prefix || ''}`, this.props.UserId, itemId, `${s3Key}`);
        const contents = (request as any)[s3Key];
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

    const Key = {}

    if (parentField) {
      (Key as any)[parentField] = parent;
    }

    (Key as any)[idField] = itemId;

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

    return await this.getItemById(itemId, parent);
  }
}