import { EngagementsCrud } from './engagements-crud';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { GetItemInput } from 'aws-sdk/clients/dynamodb';

chai.use(chaiAsPromised);

describe('The `getEngagementById` method of the Engagements CRUD service', () => {
  let service: EngagementsCrud;
  
  beforeEach(() => {
    service = new EngagementsCrud({
      EngagementsTableName: 'dummy',
      TeamId: '123',
      UserId: '123',
    })
  });

  it('should fail if an `EngagementId` is not given', () => {
    // @ts-ignore
    expect(service.getEngagementById()).to.be.rejectedWith(EngagementsCrud.INVALID_ENGAGEMENT_ID_EXCEPTION);
  });

  it('should request DynamoDB for the item with the given ID', done => {
    const myService = new EngagementsCrud({
      EngagementsTableName: 'dummy',
      TeamId: '123',
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

    myService.getEngagementById('123')
  });

  it('should respond with the item retrieved from the database', () => {
    const myService = new EngagementsCrud({
      EngagementsTableName: 'dummy',
      TeamId: '123',
      UserId: '123',
      DocumentClient: {
        // @ts-ignore
        get: (input: GetItemInput) => ({
          async promise() {
            return {
              Item: {
                Id: '123',
                CustomerName: 'dummy',
                EngagementName: 'dummy',
                Description: 'description'
              }
            }
          }
        })
      }
    });

    expect(myService.getEngagementById('123')).to.eventually.have.property('Id').equals('123');
    expect(myService.getEngagementById('123')).to.eventually.have.property('CustomerName').equals('dummy');
    expect(myService.getEngagementById('123')).to.eventually.have.property('EngagementName').equals('dummy');
    expect(myService.getEngagementById('123')).to.eventually.have.property('Description').equals('description');
  });

  it('should fail if the requested item is not found', () => {
    const myService = new EngagementsCrud({
      EngagementsTableName: 'dummy',
      TeamId: '123',
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

    expect(myService.getEngagementById('123')).to.eventually.be.rejectedWith(EngagementsCrud.ENGAGEMENT_NOT_FOUND_EXCEPTION);
  });
});