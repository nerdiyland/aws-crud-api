import { EngagementsCrud } from './engagements-crud';
import { expect } from 'chai';
import { UpdateItemInput } from 'aws-sdk/clients/dynamodb';

describe('The `updateEngagement` method of the Engagements CRUD service', () => {
  let service: EngagementsCrud;
  
  beforeEach(() => {
    service = new EngagementsCrud({
      EngagementsTableName: 'dummy',
      TeamId: '123',
      UserId: '123',
    })
  });

  it('should fail if no `EngagementId` is given', () => {
    // @ts-ignore
    expect(service.updateEngagement()).to.eventually.be.rejectedWith(EngagementsCrud.INVALID_ENGAGEMENT_ID_EXCEPTION);
  });

  it('should fail if no request object is given', () => {
    // @ts-ignore
    expect(service.updateEngagement('123')).to.eventually.be.rejectedWith(EngagementsCrud.INVALID_REQUEST_OBJECT);
  });

  it('should fail if the request object provides no changes', () => {
    expect(service.updateEngagement('123', {})).to.eventually.be.rejectedWith(EngagementsCrud.NO_CHANGES_EXCEPTION)
  });

  it('should fail when trying to update an invalid property of an engagement', () => {
    // @ts-ignore
    expect(service.updateEngagement('123', { Whatever: 'wrong' })).to.eventually.be.rejectedWith(EngagementsCrud.INVALID_REQUEST_OBJECT);
  });

  it('should compile an update expression and key and value mappings for DynamoDB', done => {
    const myService = new EngagementsCrud({
      EngagementsTableName: 'dummy',
      TeamId: '123',
      UserId: '123',
      DocumentClient: {
        // @ts-ignore
        get: (_: any) => ({
          async promise() {
            return {
              Item: {}
            }
          }
        }),

        // @ts-ignore
        update: (input: UpdateItemInput) => ({
          async promise() {
            expect(input.TableName).to.be.equals('dummy');
            expect(input.Key.Id).to.equals('1234');
            expect(input.UpdateExpression).to.be.equals('set #CustomerName = :CustomerName, #EngagementName = :EngagementName');
            expect(input.ExpressionAttributeNames).to.have.property('#CustomerName').equals('CustomerName');
            expect(input.ExpressionAttributeNames).to.have.property('#EngagementName').equals('EngagementName');
            expect(input.ExpressionAttributeValues).to.have.property(':CustomerName').equals('123');
            expect(input.ExpressionAttributeValues).to.have.property(':EngagementName').equals('234');
            done();
            return {}
          }
        })
      }
    });

    myService.updateEngagement('1234', {
      CustomerName: '123',
      EngagementName: '234'
    })
  });

  it('should fetch the updated item in Dynamo and return it', () => {
    const item = {
      CustomerName: 'test',
      EngagementName: 'test',
      // Other things
    }

    const myService = new EngagementsCrud({
      EngagementsTableName: 'dummy',
      TeamId: '123',
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

    expect(myService.updateEngagement('1234', { CustomerName: '1234' })).to.eventually.be.equals(item);
  });

});