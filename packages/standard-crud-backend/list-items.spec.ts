import { ItemsCrud } from './items-crud';
import { expect } from 'chai';
import { QueryInput } from 'aws-sdk/clients/dynamodb';

describe('The `listItems` method of the items CRUD service', () => {
  
  it('must attempt to connect to Dynamo for scanning items', done => {
    const service = new ItemsCrud({
      UserId: '123',
      ItemsTableName: 'dummy',
      AwsRegion: 'dummy',
      DocumentClient: {
        // @ts-ignore
        scan: (request: any) => ({
          async promise() {
            expect(request.TableName).to.equals('dummy');
            done();
            
            return {
              Items: []
            }
          }
        })
      }
    });
    
    service!.listItems();
  });

  describe('when using the ParentId feature', () => {
    it('must attempt to connect to Dynamo for querying items on a parent id', done => {
      const service = new ItemsCrud({
        UserId: '123',
        ItemsTableName: 'dummy',
        AwsRegion: 'dummy',
        ParentFieldName: 'MyParentId',
        ParentId: '1234',
        DocumentClient: {
          // @ts-ignore
          query: (request: QueryInput) => ({
            async promise() {
              expect((request.ExpressionAttributeNames as any)['#parentId']).to.be.equals('MyParentId');
              expect((request.ExpressionAttributeValues as any)[':parentId']).to.be.equals('1234');
              done();
              
              return {
                Items: []
              }
            }
          })
        }
      });
      
      service!.listItems();
    });
  });
});