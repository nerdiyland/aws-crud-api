import { ItemsCrud } from './items-crud';
import { expect } from 'chai';
import { DeleteItemInput } from 'aws-sdk/clients/dynamodb';

describe('The `deleteItem` method of the items CRUD service', () => {
  let service: ItemsCrud<any, any, any, any, any>;
  
  beforeEach(() => {
    service = new ItemsCrud({
      ItemsTableName: 'dummy',
      UserId: '123',
    })
  });

  it('should fail if no item ID is provided', () => {
    // @ts-ignore
    expect(service.deleteItem()).to.eventually.be.rejectedWith(ItemsCrud.INVALID_item_ID_EXCEPTION);
  });
})