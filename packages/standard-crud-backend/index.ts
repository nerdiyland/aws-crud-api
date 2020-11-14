import { } from 'aws-sdk'
import Log from '@dazn/lambda-powertools-logger';
import { ItemsCrud } from './items-crud';

export enum OperationType {
  CREATE_ITEM = 'createItem',
  LIST_ITEMS = 'listItems',
  GET_ITEM = 'getItemById',
  UPDATE_ITEM = 'updateItem',
  DELETE_ITEM = 'deleteItem'
}

const INVALID_OPERATION_EXCEPTION = new Error('Invalid operation requested');

/* TODO */
export const handler = async (event: any /* TODO */) => {
  const { UserId, TeamId, Data, OperationName } = event;

  // Assign default team
  let finalTeamId = TeamId;
  if (!TeamId) finalTeamId = 'UNKNOWN';

  Log.info('Starting items CRUD request', { UserId, Data, OperationName });
  const itemsCrud = new ItemsCrud({
    UserId,
    ItemsTableName: process.env.ITEMS_TABLE_NAME!,
  });

  let itemId: string | null = null;
  switch (OperationName) {
    case OperationType.CREATE_ITEM:
      Log.info('Processing item creation');
      const createResult = await itemsCrud.createItem(Data);
      return createResult;
    case OperationType.LIST_ITEMS:
      Log.info('Processing item list request');
      const listResult = await itemsCrud.listItems();
      return listResult;
    case OperationType.GET_ITEM:
      itemId = (Data).itemId; // TODO Change to params
      Log.info('Reading item by id', { itemId });
      try {
        const getResult = await itemsCrud.getItemById(itemId!);
        return getResult;
      } catch (e) {
        if (e === ItemsCrud.ITEM_NOT_FOUND_EXCEPTION) {
          Log.error('The requested item was not found', { itemId });
          throw 'ITEM_NOT_FOUND';
        }
      }
    case OperationType.UPDATE_ITEM:
      itemId = (Data).itemId;
      Log.info('Updating item by id', { itemId });
      const updateResult = await itemsCrud.updateItem(itemId!, Data);
      return updateResult;
    case OperationType.DELETE_ITEM:
      itemId = (Data).itemId;
      Log.info('Deleting item by id', { itemId });
      await itemsCrud.deleteItem(itemId!);
      return;
    default:
      Log.error('Unknown operation requested', { OperationName });
      throw INVALID_OPERATION_EXCEPTION;

  }

};
