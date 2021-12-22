import { IotData } from 'aws-sdk';
import Log from '@dazn/lambda-powertools-logger';
import { ItemsCrud } from './items-crud';
import { FunctionEvent } from '@aftersignals/models/apis/base/FunctionEvent';
import { CreateItemRequest } from '@aftersignals/models/apis/base/contracts/CreateItemRequest';
import { ListItemsRequest } from '@aftersignals/models/apis/base/contracts/ListItemsRequest';
import { ExtendedJSONSchema } from '@aftersignals/models/base/ExtendedSchema';
import Schemas from '@aftersignals/models/schema.extended.json'
import { v4 as uuid } from 'uuid';
import { join } from 'path';

export enum OperationType {
  CREATE_ITEM = 'createItem',
  LIST_ITEMS = 'listItems',
  GET_ITEM = 'getItemById',
  UPDATE_ITEM = 'updateItem',
  DELETE_ITEM = 'deleteItem'
}

const INVALID_OPERATION_EXCEPTION = new Error('Invalid operation requested');
const TeamMembershipsTableName = process.env.TEAM_MEMBERSHIPS_TABLE_NAME!;
const TeamResourcesTableName = process.env.TEAM_RESOURCES_TABLE_NAME!;

const IotEndpointAddress = process.env.IOT_ENDPOINT_ADDRESS!;
const EnvironmentName = process.env.AFTERSIGNALS_ENVIRONMENT_NAME!;

const PivotTableName = process.env.PIVOT_TABLE_NAME!;

/* TODO */
export const handler = async (event: FunctionEvent<any>) => {
  const { 
    Id, 
    UserId, 
    OperationName, 
    EntitySchema,
    InputSchema,
    IdFieldName,
    ParentFieldName,
    ParentId,
    IndexName,
    ListType,
    OutputFields,
    S3Fields,
    SuccessEvent,
    Security,
    Pivot
  } = event.Params as any;
  
  const Data = event.Data;
  Log.debug('Event object', { event })

  let entitySchema: ExtendedJSONSchema | undefined;
  let inputSchema: ExtendedJSONSchema | undefined;
  if (EntitySchema) {
    entitySchema = (Schemas.definitions as { [key: string]: any })[EntitySchema];
  }

  if (InputSchema) {
    inputSchema = (Schemas.definitions as { [key: string]: any })[InputSchema];
  }

  Log.info('Starting items CRUD request', { UserId, Data, OperationName });
  const itemsCrud = new ItemsCrud({
    UserId,
    ItemsTableName: process.env.ITEMS_TABLE_NAME!,
    ItemsBucketName: process.env.ITEMS_BUCKET_NAME!,
    EntitySchema: entitySchema,
    InputSchema: inputSchema,
    IdFieldName,
    ParentFieldName,
    ParentId,
    IndexName,
    ListType,
    OutputFields,
    S3Fields,
    Security,
    TeamMembershipsTableName,
    TeamResourcesTableName,
    Pivot,
    PivotTableName
  });

  if (!UserId) {
    Log.warn('No user Id field was provided. Attempting to pick it up from request Data');
    const userId = Data.UserId;
    if (!userId) {
      Log.warn('Still no user ID. Something wrong may happen.');
      UserId = 'system'
    } else {
      UserId = userId;
    }
  }

  try {
    switch (OperationName) {
      case OperationType.CREATE_ITEM:
        Log.info('Processing item creation');
        const createResult = await itemsCrud.createItem(Data as CreateItemRequest);
        if (SuccessEvent) {
          Log.info('Operation is configured to submit an event', { EventTopic: SuccessEvent });
          
          const iotData = new IotData({
            endpoint: IotEndpointAddress
          });

          await iotData.publish({
            topic: join(
              'AfterSignals',
              EnvironmentName,
              'events', 
              UserId, 
              SuccessEvent
            ),
            payload: JSON.stringify({
              Id: createResult.Id,
              UserId,
              EventId: uuid(),
              EventDate: new Date().toISOString(),
            })
          }).promise();
        }
        return mapResponse(createResult, OutputFields);
      case OperationType.LIST_ITEMS:
        Log.info('Processing item list request');
        const listResult = await itemsCrud.listItems(Data as ListItemsRequest<any>);
        return listResult;
      case OperationType.GET_ITEM:
        Log.info('Reading item by id', { Id });
        const getResult = await itemsCrud.getItemById(Id!);
        return getResult;
      case OperationType.UPDATE_ITEM:
        Log.info('Updating item by id', { Id });
        const updateResult = await itemsCrud.updateItem(Id!, Data);
        if (SuccessEvent) {
          Log.info('Operation is configured to submit an event', { EventTopic: SuccessEvent });
          
          const iotData = new IotData({
            endpoint: IotEndpointAddress
          });

          await iotData.publish({
            topic: join(`AfterSignals/events`, UserId, SuccessEvent),
            payload: JSON.stringify({
              Id: updateResult.Id,
              UserId,
              EventId: uuid(),
              EventDate: new Date().toISOString(),
            })
          }).promise();
        }
        return updateResult;
      case OperationType.DELETE_ITEM:
        Log.info('Deleting item by id', { Id });
        await itemsCrud.deleteItem(Id!);
        if (SuccessEvent) {
          Log.info('Operation is configured to submit an event', { EventTopic: SuccessEvent });
          
          const iotData = new IotData({
            endpoint: IotEndpointAddress
          });

          await iotData.publish({
            topic: join(`AfterSignals/events`, UserId, SuccessEvent),
            payload: JSON.stringify({
              Id,
              UserId,
              EventId: uuid(),
              EventDate: new Date().toISOString(),
            })
          }).promise();
        }
        return;
      default:
        Log.error('Unknown operation requested', { OperationName });
        throw INVALID_OPERATION_EXCEPTION;
    }
  } catch (e) {
    Log.error(e);

    if (e === ItemsCrud.ITEM_NOT_FOUND_EXCEPTION) {
      Log.error('The requested item was not found', { Id });
      throw new Error('Item not found');
    }

    const statusCode = e.statusCode;
    switch (statusCode) {
      case 400:
        throw new Error('Bad request');
      case 401:
      case 403:
        throw new Error('Unauthorized');
      case 404:
        throw new Error('Item not found');
      // TODO Other 4XX errors
      default:
        throw new Error('Internal server error');
    }

  }
};

function mapResponse(response: any, fields?: string[]) {
  if (!fields) return response;

  return Object.keys(response)
    .filter(k => fields.indexOf(k) !== -1)
    .map(k => ({ [k]: response[k] }))
    .reduce((t: any, i: any) => ({ ...t, ...i }), {})
}