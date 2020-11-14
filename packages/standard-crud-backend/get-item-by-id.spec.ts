import { ItemsCrud } from './items-crud';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { GetItemInput } from 'aws-sdk/clients/dynamodb';

chai.use(chaiAsPromised);

describe('The `getItemById` method of the items CRUD service', () => {
  let service: ItemsCrud<any, any, any, any>;
  
  beforeEach(() => {
    service = new ItemsCrud({
      ItemsTableName: 'dummy',
      UserId: '123',
    })
  });

  it('should fail if an `itemId` is not given', () => {
    // @ts-ignore
    expect(service.getItemById()).to.be.rejectedWith(ItemsCrud.INVALID_item_ID_EXCEPTION);
  });

  it('should request DynamoDB for the item with the given ID', done => {
    const myService = new ItemsCrud({
      ItemsTableName: 'dummy',
      UserId: '123',
      DocumentClient: {
        // @ts-ignore
        get: (input: GetItemInput) => ({
          promise() {
            expect(input.TableName).to.be.equals('dummy');
            expect(input.Key.Id).to.be.equals('123');
            done();
            return {
              Item: {}
            }
          }
        })
      }
    });

    myService.getItemById('123')
  });

  it('should respond with the item retrieved from the database', () => {
    const myService = new ItemsCrud({
      ItemsTableName: 'dummy',
      UserId: '123',
      DocumentClient: {
        // @ts-ignore
        get: (input: GetItemInput) => ({
          async promise() {
            return {
              Item: {
                Id: '123',
                CustomerName: 'dummy',
                itemName: 'dummy',
                Description: 'description'
              }
            }
          }
        })
      }
    });

    expect(myService.getItemById('123')).to.eventually.have.property('Id').equals('123');
    expect(myService.getItemById('123')).to.eventually.have.property('CustomerName').equals('dummy');
    expect(myService.getItemById('123')).to.eventually.have.property('itemName').equals('dummy');
    expect(myService.getItemById('123')).to.eventually.have.property('Description').equals('description');
  });

  it('should fail if the requested item is not found', () => {
    const myService = new ItemsCrud({
      ItemsTableName: 'dummy',
      UserId: '123',
      DocumentClient: {
        // @ts-ignore
        get: (input: GetItemInput) => ({
          async promise() {
            return {
              
            }
          }
        })
      }
    });

    expect(myService.getItemById('123')).to.eventually.be.rejectedWith(ItemsCrud.ITEM_NOT_FOUND_EXCEPTION);
  });
});