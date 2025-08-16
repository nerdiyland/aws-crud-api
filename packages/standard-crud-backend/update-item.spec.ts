import { ItemsCrud } from './items-crud';
import { expect } from 'chai';
import { UpdateItemInput } from 'aws-sdk/clients/dynamodb';

describe('The `updateItem` method of the items CRUD service', () => {
  let service: ItemsCrud<any, any, any, any, any>;
  
  beforeEach(() => {
    service = new ItemsCrud({
      ItemsTableName: 'dummy',
      UserId: '123',
    })
  });

  it('should fail if no `itemId` is given', () => {
    // @ts-ignore
    expect(service.updateItem()).to.eventually.be.rejectedWith(ItemsCrud.INVALID_item_ID_EXCEPTION);
  });

  it('should fail if no request object is given', () => {
    // @ts-ignore
    expect(service.updateItem('123')).to.eventually.be.rejectedWith(ItemsCrud.INVALID_REQUEST_OBJECT);
  });

  it('should fail if the request object provides no changes', () => {
    expect(service.updateItem('123', {})).to.eventually.be.rejectedWith(ItemsCrud.NO_CHANGES_EXCEPTION)
  });

  it('should fail when trying to update an invalid property of an item', () => {
    // @ts-ignore
    expect(service.updateItem('123', { Whatever: 'wrong' })).to.eventually.be.rejectedWith(ItemsCrud.INVALID_REQUEST_OBJECT);
  });

  it('should fetch the updated item in Dynamo and return it', () => {
    const item = {
      CustomerName: 'test',
      itemName: 'test',
      // Other things
    }

    const myService = new ItemsCrud({
      ItemsTableName: 'dummy',
      UserId: '123',
      DocumentClient: {
        // @ts-ignore
        get: (_: any) => ({
          async promise() {
            return {
              Item: item
            }
          }
        }),
        // @ts-ignore
        update: (input: UpdateItemInput) => ({
          async promise() {
            return {}
          }
        })
      }
    });

    expect(myService.updateItem('1234', { CustomerName: '1234' })).to.eventually.be.equals(item);
  });

});