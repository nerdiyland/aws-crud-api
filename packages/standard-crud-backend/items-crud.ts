import { BaseCrudApiOperationSecurityConfiguration } from './models';
import {
  DynamoDB,
  QueryCommandOutput,
  ScanCommandOutput,
  UpdateItemInput,
} from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { StandaloneObject } from './models/base/StandaloneObject';
import { CreateItemRequest } from './models/io/base/contracts/CreateItemRequest';
import { ListItemsRequest } from './models/io/base/contracts/ListItemsRequest';
import { ListItemsResponse } from './models/io/base/contracts/ListItemsResponse';
import { ExtendedJSONSchema } from './models/base/ExtendedSchema';
import { Logger } from '@aws-lambda-powertools/logger';
import path from 'path';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

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
   * Optionally, provide the DynamoDB instance to use
   */
  DynamoDB?: DynamoDB;

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
   * Field for data owner
   */
  OwnerFieldName?: string;

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

  S3Fields?: { [key: string]: any };

  Security?: BaseCrudApiOperationSecurityConfiguration;

  TeamMembershipsTableName?: string;

  TeamResourcesTableName?: string;

  Pivot?:
    | 'none'
    | {
        SourceField: string;
        PivotFields: string[];
      };

  PivotTableName?: string;

  /**
   * If set to true, entity scaffolding will not be done
   */
  NoScaffolding?: boolean;
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
  static NO_ITEMS_TABLE_EXCEPTION = new Error(
    'No value has been given for the `ItemsTableName` property'
  );

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
  private readonly ddb: DynamoDB;

  /**
   * Accessor for S3
   */
  private readonly s3: S3;

  /**
   * Stores user teams
   */
  private userTeams: string[] = [];

  private logger: Logger;

  constructor(props: ItemsCrudProps) {
    this.logger = new Logger({ serviceName: 'itemsCrud' });

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
    this.ddb =
      props.DynamoDB ||
      new DynamoDB({
        region: props.AwsRegion || process.env.AWS_REGION,
      });

    this.s3 = new S3({
      region: props.AwsRegion || process.env.AWS_REGION,
    });
  }

  /**
   * Creates an item in the system, and fills the required information
   * @param request Input object to configure the item
   */
  async createItem(request: C): Promise<C> {
    if (!request) {
      throw ItemsCrud.INVALID_REQUEST_OBJECT;
    }

    const Item: any = request;
    // if (this.props.NoScaffolding === true) {
    //   this.logger.info('Ignoring scaffolding as per request');
    // } else {
    //   // If an ID is given, update instead
    //   const requestId = (request as any)[this.props.IdFieldName || 'Id'];
    //   if (!!requestId) {
    //     this.logger.warn('Requested Creation, but this is actually an update. Redirecting')
    //     return await this.updateItem(requestId, request as any) as any;
    //   }

    //   // TODO Validate model
    //   this.logger.info('Scaffolding object');
    //   const schema: ExtendedJSONSchema = (this.props.InputSchema || Schemas.definitions.CreateItemRequest) as any;
    //   const scaffold = new Scaffold(schema, {
    //     ...request,
    //     UserId: this.props.UserId
    //   });
    //   Item = scaffold.data;
    // }

    // Add parentId to object
    if (this.props.ParentFieldName) {
      const parentId = this.props.ParentId!;
      this.logger.debug('Configuring parent field', {
        ParentField: this.props.ParentFieldName,
        ParentId: parentId,
      });
      Item[this.props.ParentFieldName] = parentId;
    }

    // Manage S3 Fields
    const ret = Item;
    let finalRequest: any = { ...Item };
    if (this.props.S3Fields) {
      const s3KeyNames = Object.keys(this.props.S3Fields!);
      this.logger.info('Managing S3 fields', { fields: s3KeyNames });

      const s3Keys = await Promise.all(
        s3KeyNames.map(async (s3Key: any) => {
          const s3KeyValue = this.props.S3Fields![s3Key];
          const key = path.join(
            `${s3KeyValue.Prefix || ''}`,
            this.props.UserId,
            (Item as any)[this.props.IdFieldName || 'Id']!,
            `${s3Key}`
          );

          // If S3 data is an object, put it.
          // If it is raw data, then get signed url
          switch (s3KeyValue.DataFormat) {
            case 'raw':
              this.logger.info('Generating signed url for field', {
                Field: s3Key,
                ContentType: s3KeyValue.ContentType,
              });

              // Get signed url to upload raw data
              const signedUrl = await getSignedUrl(
                this.s3,
                new PutObjectCommand({
                  Bucket: this.props.ItemsBucketName!,
                  Key: key,
                  ContentType: s3KeyValue.ContentType,
                }),
                {
                  expiresIn: 30,
                }
              );

              ret[s3Key] = signedUrl;
              return { [s3Key]: `s3://${this.props.ItemsBucketName}/${key}` };
            case 'json':
            default:
              const contents = (finalRequest as any)[s3Key];
              if (contents !== undefined) {
                const strContents =
                  typeof contents === 'object' ? JSON.stringify(contents) : contents;

                const s3Response = await this.s3.putObject({
                  Bucket: this.props.ItemsBucketName!,
                  Key: key,
                  Body: strContents,
                  // ServerSideEncryption: 'aws:kms',
                  // TODO Configure encryption and more
                });

                return { [s3Key]: key };
              }
          }

          return {};
        })
      );

      const objectReplacement = s3Keys
        .filter(i => !!i) // Filter null keys (from raw data)
        .reduce((t, i) => ({ ...t, ...i }), {});
      finalRequest = {
        ...finalRequest,
        ...objectReplacement,
      };
    }

    this.logger.info('Storing object');
    await this.ddb.putItem({
      TableName: this.props.ItemsTableName,
      Item: marshall(finalRequest, { removeUndefinedValues: true }),
    });

    return ret;
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

    this.logger.info('Removing object from storage', { Key });

    // Get item first
    this.logger.debug('Fetching item first', { ItemId: itemId, ParentId: parentId });
    const item = await this.getItemById(itemId, parentId);

    // Validate item security
    this.logger.debug('Validating item security');
    const isAuthorized = await this.verifyItemSecurity(item);
    if (!isAuthorized) {
      throw ItemsCrud.UNAUTHORIZED_EXCEPTION;
    }

    // Delete S3 data
    if (this.props.S3Fields) {
      const s3KeyNames = Object.keys(this.props.S3Fields!);
      this.logger.info('Managing S3 fields', { fields: s3KeyNames });

      const objects = s3KeyNames.map((s3Key: any) => {
        const s3KeyValue = this.props.S3Fields![s3Key];
        const key = path.join(
          `${s3KeyValue.Prefix || ''}`,
          this.props.UserId,
          (item as any)[this.props.IdFieldName || 'Id']!,
          `${s3Key}`
        );
        return {
          Key: key,
        };
      });

      this.logger.debug('Deleting files from S3', { Files: objects });
      const s3Response = await this.s3.deleteObjects({
        Bucket: this.props.ItemsBucketName!,
        Delete: {
          Objects: objects,
        },
      });

      this.logger.debug('Successfully deleted S3 files');
    }

    this.logger.debug('Delete item request', {
      Key,
    });

    await this.ddb.deleteItem({
      TableName: this.props.ItemsTableName,
      Key: marshall(Key),
    });
  }

  /**
   * Retrieves the item identified by the provided ID.
   * @param itemId Id of the item
   */
  async getItemById(itemId: string, parentId?: string): Promise<R> {
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

    this.logger.info('Getting element by Id', { Key, TableName: this.props.ItemsTableName });

    const response = await this.ddb.getItem({
      TableName: this.props.ItemsTableName,
      Key: marshall(Key),
    });

    if (!response.Item) {
      this.logger.info('Item was not found', { Key });
      throw ItemsCrud.ITEM_NOT_FOUND_EXCEPTION;
    }

    // Verify ownership of object
    // It's a 403, but show a 404 as user doesn't need to know whether the object exists.
    let responseItem = unmarshall(response.Item!);
    const isAuthorizedForItem = await this.verifyItemSecurity(responseItem);
    if (!isAuthorizedForItem) {
      this.logger.info('User is not authorized to access item', { Key });
      throw ItemsCrud.ITEM_NOT_FOUND_EXCEPTION;
    }

    // Manage S3 Fields
    if (this.props.S3Fields) {
      const s3KeyNames = Object.keys(this.props.S3Fields!);
      this.logger.info('Managing S3 fields', { fields: s3KeyNames });

      try {
        const s3Keys = await Promise.all(
          s3KeyNames.map(async (s3Key: any) => {
            const s3KeyValue = this.props.S3Fields![s3Key];
            this.logger.debug('Managing S3 field', { Key: s3Key, Configuration: s3KeyValue });
            const dataOwner = this.props.OwnerFieldName
              ? responseItem[this.props.OwnerFieldName]
              : responseItem.UserId!;

            switch (s3KeyValue.DataFormat) {
              case 'raw':
                // Get signed URL for content
                const key = path.join(
                  `${s3KeyValue.Prefix || ''}`,
                  dataOwner,
                  (responseItem as any)[this.props.IdFieldName || 'Id']!,
                  `${s3Key}`
                );
                const signedUrl = await getSignedUrl(
                  this.s3,
                  new GetObjectCommand({
                    Bucket: this.props.ItemsBucketName!,
                    Key: key,
                  }),
                  {
                    expiresIn: 3600,
                  }
                );

                return { [s3Key]: signedUrl };
              case 'json':
              default:
                const objectKey = responseItem[s3Key];
                if (!objectKey) {
                  return { [s3Key]: undefined };
                }

                const contents = await this.s3.getObject({
                  Bucket: this.props.ItemsBucketName!,
                  Key: objectKey,
                });

                const contentStr = await contents.Body!.transformToString();
                const parsedContents = JSON.parse(contentStr);
                return { [s3Key]: parsedContents };
            }
          })
        );

        const replacements = s3Keys.reduce((t, i) => ({ ...t, ...i }), {});
        responseItem = {
          ...responseItem,
          ...replacements,
        };
      } catch (e) {
        this.logger.error('Failed to process S3 fields', { Error: e });
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
  async listItems(request?: ListItemsRequest<L>): Promise<ListItemsResponse<R>> {
    // Paging results
    // XXX For now paging just works automatically, and all pages are retrieved when fetching owned or parent items.

    let items: any[] = [];
    if (this.props.ListType === 'owned') {
      this.logger.info('Fetching owned items', {
        UserId: this.props.UserId,
        IndexName: this.props.IndexName,
      });
      let lastPageKey = undefined;

      do {
        const queryItems: QueryCommandOutput = await this.ddb.query({
          TableName: this.props.ItemsTableName,
          IndexName: this.props.IndexName,
          KeyConditionExpression: '#userId = :userId',
          ExpressionAttributeNames: {
            '#userId': this.props.ParentFieldName || 'UserId',
          },
          ExpressionAttributeValues: {
            ':userId': marshall(this.props.UserId),
          },
          ExclusiveStartKey: lastPageKey,
        });

        items = items.concat((queryItems.Items || []).map(i => unmarshall(i)));

        lastPageKey = queryItems.LastEvaluatedKey;
        if (lastPageKey) {
          this.logger.debug('There are more results to fetch', { LastItem: lastPageKey });
        }
      } while (lastPageKey);
    } else if (this.props.ParentFieldName !== undefined) {
      this.logger.info('Fetching items by ParentId', {
        ParentId: this.props.ParentId,
        ParentIdField: this.props.ParentFieldName,
        IndexName: this.props.IndexName,
      });

      let lastPageKey = undefined;

      do {
        const queryItems: QueryCommandOutput = await this.ddb.query({
          TableName: this.props.ItemsTableName,
          IndexName: this.props.IndexName,
          KeyConditionExpression: '#parentId = :parentId',
          ExpressionAttributeNames: {
            '#parentId': this.props.ParentFieldName!,
          },
          ExpressionAttributeValues: {
            ':parentId': marshall(this.props.ParentId),
          },
          ExclusiveStartKey: lastPageKey,
        });

        items = items.concat((queryItems.Items || []).map(i => unmarshall(i)));
        lastPageKey = queryItems.LastEvaluatedKey;
        if (lastPageKey) {
          this.logger.debug('There are more results to fetch', { LastItem: lastPageKey });
        }
      } while (lastPageKey);
    } else {
      this.logger.info('Scanning items');
      const scanItems: ScanCommandOutput = await this.ddb.scan({
        TableName: this.props.ItemsTableName,
      });

      items = items.concat((scanItems.Items || []).map(i => unmarshall(i)));
    }

    // Manage operation security
    this.logger.debug('Managing item security', { OriginalListCount: items.length });
    let filteredItems = [];
    switch (this.props.ListType) {
      case 'owned':
        filteredItems = items;
        // Security here is handled by default. Only owned items will be fetched.
        break;
      default:
        // Filter items by security configuration
        filteredItems = await Promise.all(
          items.filter(async (item: StandaloneObject) => await this.verifyItemSecurity(item))
        );
    }

    // Parse field-level security
    this.logger.debug('Applying field-level security', { FilteredListCount: filteredItems.length });
    let mappedItems: any[] = await Promise.all(
      filteredItems.map(async (item: StandaloneObject) => await this.applyFieldLevelSecurity(item))
    );

    // Pivot
    if (this.props.Pivot && this.props.Pivot !== 'none') {
      const pivot = this.props.Pivot as any;
      this.logger.info('Applying pivot configuration', { Configuration: pivot });
      const sourceKeys = mappedItems.map((item: any) => item[pivot.SourceField]);

      const chunks = [];
      for (let i = 0; i < sourceKeys.length; i += 100) {
        chunks.push(sourceKeys.slice(i, Math.min(i + 100, sourceKeys.length)));
      }

      this.logger.info('Fetching pivot items');
      const pivotResultsResponses = await Promise.all(
        chunks.map(async chunk => {
          const results = await this.ddb.batchGetItem({
            RequestItems: {
              [this.props.PivotTableName!]: {
                Keys: chunk.map(Id => ({ Id: marshall(Id) })),
              },
            },
          });

          const items = results.Responses![this.props.PivotTableName!];
          return items;
        })
      );

      const allResponses = pivotResultsResponses.flat().map(r => unmarshall(r));
      const pivotedItems = mappedItems.map((item: any) => {
        const pivotItem: any = allResponses.find(ii => ii.Id === item[pivot.SourceField])!;

        return {
          ...item,
          ...pivot.PivotFields.reduce(
            (t: any, i: any) => ({
              ...t,
              [i]: pivotItem[i],
            }),
            {}
          ),
        };
      });

      // Store items
      mappedItems = pivotedItems;
    }

    // TODO Paging out

    this.logger.debug('Handing response to client');
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
      ...(!parentField ? {} : { [parentField]: marshall(parentId) }),
      [idField]: marshall(itemId),
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
      this.logger.info('Managing S3 fields', { fields: s3KeyNames });

      const s3Keys = await Promise.all(
        s3KeyNames.map(async (s3Key: any) => {
          const s3KeyValue = this.props.S3Fields![s3Key];
          const key = path.join(
            `${s3KeyValue.Prefix || ''}`,
            this.props.UserId,
            itemId,
            `${s3Key}`
          );

          // If S3 data is an object, put it.
          // If it is raw data, then get signed url
          switch (s3KeyValue.DataFormat) {
            case 'raw':
              this.logger.info("Ignoring s3Field as it's a raw object", { Field: s3Key });
              return null;
            case 'json':
            default:
              const contents = (mappedRequest as any)[s3Key];
              const strContents =
                typeof contents === 'object' ? JSON.stringify(contents) : contents;

              await this.s3.putObject({
                Bucket: this.props.ItemsBucketName!,
                Key: key,
                Body: strContents,
                // ServerSideEncryption: 'aws:kms',
                // TODO Configure encryption and more
              });

              return { [s3Key]: key };
          }
        })
      );

      const objectReplacement = s3Keys.filter(k => !!k).reduce((t, i) => ({ ...t, ...i }), {});

      finalRequest = {
        ...finalRequest,
        ...objectReplacement,
      };
    }

    const requestObject: UpdateItemInput = {
      TableName: this.props.ItemsTableName,
      Key,
      UpdateExpression: `set ${changedKeys.map(k => `#${k} = :${k}`).join(', ')}`.trim(),
      ExpressionAttributeNames: changedKeys
        .map(k => ({ [`#${k}`]: k }))
        .reduce((t: any, i: any) => ({ ...t, ...i }), {}),
      ExpressionAttributeValues: changedKeys
        .map(k => ({ [`:${k}`]: marshall(finalRequest[k]) }))
        .reduce((t: any, i: any) => ({ ...t, ...i }), {}),
    };

    this.logger.info('Updating object', {
      Key,
      UpdateExpression: requestObject.UpdateExpression,
      TableName: this.props.ItemsTableName,
    });

    await this.ddb.updateItem(requestObject);
    return await this.getItemById(itemId, parentId);
  }

  async applyFieldLevelSecurity(item: StandaloneObject) {
    const itemOwner = item.UserId!;

    // TODO Manage team stuff
    const securityToApply: 'Owner' | 'Public' =
      itemOwner === this.props.UserId ? 'Owner' : 'Public';

    const security = (this.props.Security || {})[securityToApply] || {};
    const fields = security.Fields || Object.keys(item);

    // TODO Manage sub-field permissions
    return fields.reduce((ret, field) => ({ ...ret, [field]: (item as any)[field] }), {});
  }

  async verifyItemSecurity(item: StandaloneObject): Promise<boolean> {
    const itemOwner = this.props.OwnerFieldName
      ? (item as any)[this.props.OwnerFieldName]
      : item.UserId!;
    this.logger.info('Verifying item security', { userId: this.props.UserId, ownerId: itemOwner });

    // TODO Manage team stuff
    const securityToApply: 'Owner' | 'Public' =
      itemOwner === this.props.UserId ? 'Owner' : 'Public';
    if (securityToApply === 'Public' && this.props.Security && this.props.Security!.Team) {
      this.logger.info('Finding user teams and resources');
      const userTeamsResponse = await this.ddb.query({
        TableName: this.props.TeamMembershipsTableName!,
        IndexName: 'ByMemberId',
        KeyConditionExpression: '#userId = :userId',
        ExpressionAttributeNames: {
          '#userId': 'MemberId',
        },
        ExpressionAttributeValues: {
          ':userId': marshall(this.props.UserId),
        },
      });

      const userTeams: any[] = (userTeamsResponse.Items || []).map(i => unmarshall(i)) as any[];
      this.userTeams = userTeams.map((t: any) => t.TeamId!);
      this.logger.info('Fetching team resource information', { Teams: this.userTeams });

      const teamResourceRequest = {
        RequestItems: {
          [this.props.TeamResourcesTableName!]: {
            Keys: userTeams
              .map((team: any) => marshall(team.Id!))
              .map(TeamId => ({
                TeamId,
                Id: marshall(item.Id!),
              })),
          },
        },
      };

      const teamResourcesResponse = await this.ddb.batchGetItem(teamResourceRequest);
      const teamResources = Object.values(teamResourcesResponse.Responses!);
      if (teamResources.length) return true;

      this.logger.error('This is not a team resource', {
        UserId: this.props.UserId,
        ResourceId: item.Id!,
      });
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
