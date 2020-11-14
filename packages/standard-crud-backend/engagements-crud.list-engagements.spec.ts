import { EngagementsCrud } from './engagements-crud';
import { expect } from 'chai';

describe('The `listEngagements` method of the Engagements CRUD service', () => {
  
  it('must attempt to connect to Dynamo for scanning items', done => {
    const service = new EngagementsCrud({
      UserId: '123',
      TeamId: '123',
      EngagementsTableName: 'dummy',
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
    
    service!.listEngagements();
  });
});