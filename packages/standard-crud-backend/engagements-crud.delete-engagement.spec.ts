import { EngagementsCrud } from './engagements-crud';
import { expect } from 'chai';
import { DeleteItemInput } from 'aws-sdk/clients/dynamodb';

describe('The `deleteEngagement` method of the Engagements CRUD service', () => {
  let service: EngagementsCrud;
  
  beforeEach(() => {
    service = new EngagementsCrud({
      EngagementsTableName: 'dummy',
      TeamId: '123',
      UserId: '123',
    })
  });

  it('should fail if no engagement ID is provided', () => {
    // @ts-ignore
    expect(service.deleteEngagement()).to.eventually.be.rejectedWith(EngagementsCrud.INVALID_ENGAGEMENT_ID_EXCEPTION);
  });

  it('should ask DynamoDB for deletion of the item', done => {
    const myService = new EngagementsCrud({
      EngagementsTableName: 'dummy',
      TeamId: '123',
      UserId: '123',
      DocumentClient: {
        // @ts-ignore
        delete: (input: DeleteItemInput) => ({
          async promise() {
            expect(input.TableName).to.be.equals('dummy');
            expect(input.Key.Id).to.equals('1234');
            done();
            return {}
          }
        })
      }
    });

    myService.deleteEngagement('1234');
  });

})