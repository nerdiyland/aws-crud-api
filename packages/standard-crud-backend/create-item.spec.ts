import { ItemsCrud } from './items-crud';
import { expect } from 'chai';
import { PutItemInput } from 'aws-sdk/clients/dynamodb';

describe('The `createItem` method of the items CRUD service', () => {
  let service: ItemsCrud<any, any, any, any> | null = null;

  beforeEach(() => {
    service = new ItemsCrud({
      UserId: '123',
      ItemsTableName: 'dummy',
      AwsRegion: 'dummy'
    })
  });

  describe('when providing invalid configuration', () => {
    it('must fail if a request object is not provided', done => {
      // @ts-ignore
      service!.createItem()
        .then(() => done(new Error('Expecting method to fail')))
        .catch(e => expect(e).to.be.equals(ItemsCrud.INVALID_REQUEST_OBJECT) && done())
    });
  
    // TODO Data model validation tests
  });


  describe('when providing valid configuration', () => {
    it('Must create a valid request to dynamo', done => {
      const service = new ItemsCrud({
        UserId: '123',
        ItemsTableName: 'dummy',
        AwsRegion: 'dummy',
        DocumentClient: {
          // @ts-ignore
          put: (request: PutItemInput) => ({
            async promise() {
              expect(request.TableName).to.equals('dummy');
              expect(request.Item.Name).to.equals('dummy');
              expect(request.Item.Description).to.equals('Dummy item');
              expect(request.Item.Id).not.to.be.undefined;
              expect(request.Item.UserId).to.equals('123');
              done();
            }
          })
        }
      });
      
      service!.createItem({
        Name: 'dummy',
        Description: 'Dummy item'
      }).catch(e => done(e))
    });

    it('Must return a valid item as output', async () => {
      const service = new ItemsCrud({
        UserId: '123',
        ItemsTableName: 'dummy',
        AwsRegion: 'dummy',
        DocumentClient: {
          // @ts-ignore
          put: (request: PutItemInput) => ({
            async promise() {
              return request;
            }
          })
        }
      });
      
      const item = await service!.createItem({
        Name: 'dummy',
        Description: 'Dummy item'
      });

      expect(item.Id).not.to.be.undefined;
      expect(item.UserId).to.equals('123');
      expect(item.Name).to.equals('dummy');
      expect(item.Description).to.equals('Dummy item');
    });

  });
})