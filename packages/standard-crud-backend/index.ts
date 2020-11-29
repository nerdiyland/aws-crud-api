import Log from '@dazn/lambda-powertools-logger';
import { ItemsCrud } from './items-crud';
import { FunctionEvent } from '@aftersignals/models/apis/base/FunctionEvent';
import { CreateItemRequest } from '@aftersignals/models/apis/base/contracts/CreateItemRequest';
import { ListItemsRequest } from '@aftersignals/models/apis/base/contracts/ListItemsRequest';
import { ExtendedJSONSchema } from '@aftersignals/models/base/ExtendedSchema';
import Schemas from '@aftersignals/models/schema.extended.json'

export enum OperationType {
  CREATE_ITEM = 'createItem',
  LIST_ITEMS = 'listItems',
  GET_ITEM = 'getItemById',
  UPDATE_ITEM = 'updateItem',
  DELETE_ITEM = 'deleteItem'
}

const INVALID_OPERATION_EXCEPTION = new Error('Invalid operation requested');

/* TODO */
export const handler = async (event: FunctionEvent<any>) => {
  const { 
    Id, 
    UserId, 
    OperationName, 
    EntitySchema,
    InputSchema,
    IdFieldName,
    ParentFieldName
  } = event.Params;
  
  const Data = event.Data;
  Log.debug('Event object', { event })

  let entitySchema: ExtendedJSONSchema | undefined;
  let inputSchema: ExtendedJSONSchema | undefined;
  if (EntitySchema) {
    entitySchema = (Schemas.definitions as { [key: string]: ExtendedJSONSchema })[EntitySchema];
  }

  if (InputSchema) {
    inputSchema = (Schemas.definitions as { [key: string]: ExtendedJSONSchema })[InputSchema];
  }

  Log.info('Starting items CRUD request', { UserId, Data, OperationName });
  const itemsCrud = new ItemsCrud({
    UserId,
    ItemsTableName: process.env.ITEMS_TABLE_NAME!,
    EntitySchema: entitySchema,
    InputSchema: inputSchema,
    IdFieldName,
    ParentFieldName
  });

  switch (OperationName) {
    case OperationType.CREATE_ITEM:
      Log.info('Processing item creation');
      const createResult = await itemsCrud.createItem(Data as CreateItemRequest);
      return createResult;
    case OperationType.LIST_ITEMS:
      Log.info('Processing item list request');
      const listResult = await itemsCrud.listItems(Data as ListItemsRequest<any>);
      return listResult;
    case OperationType.GET_ITEM:
      Log.info('Reading item by id', { Id });
      try {
        const getResult = await itemsCrud.getItemById(Id!);
        return getResult;
      } catch (e) {
        if (e === ItemsCrud.ITEM_NOT_FOUND_EXCEPTION) {
          Log.error('The requested item was not found', { Id });
          throw 'ITEM_NOT_FOUND';
        }
      }
    case OperationType.UPDATE_ITEM:
      Log.info('Updating item by id', { Id });
      const updateResult = await itemsCrud.updateItem(Id!, Data);
      return updateResult;
    case OperationType.DELETE_ITEM:
      Log.info('Deleting item by id', { Id });
      await itemsCrud.deleteItem(Id!);
      return;
    default:
      Log.error('Unknown operation requested', { OperationName });
      throw INVALID_OPERATION_EXCEPTION;
  }
};
