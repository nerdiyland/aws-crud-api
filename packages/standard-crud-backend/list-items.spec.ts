import { ItemsCrud } from './items-crud';
import { expect } from 'chai';

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
});