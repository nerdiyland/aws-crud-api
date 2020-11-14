import { EngagementsCrud } from './engagements-crud';
import { expect } from 'chai';
import { PutItemInput } from 'aws-sdk/clients/dynamodb';

describe('The `createEngagement` method of the Engagements CRUD service', () => {
  let service: EngagementsCrud | null = null;

  beforeEach(() => {
    service = new EngagementsCrud({
      UserId: '123',
      TeamId: '123',
      EngagementsTableName: 'dummy',
      AwsRegion: 'dummy'
    })
  });

  describe('when providing invalid configuration', () => {
    it('must fail if a request object is not provided', done => {
      // @ts-ignore
      service!.createEngagement()
        .then(() => done(new Error('Expecting method to fail')))
        .catch(e => expect(e).to.be.equals(EngagementsCrud.INVALID_REQUEST_OBJECT) && done())
    });
  
    it('must fail if a request object does not contain a `CustomerName`', done => {
      // @ts-ignore
      service!.createEngagement({})
        .then(() => done(new Error('Expecting method to fail')))
        .catch(e => expect(e).to.be.equals(EngagementsCrud.INVALID_REQUEST_OBJECT) && done())
    });
  
    it('must fail if a request object does not contain a `EngagementName`', done => {
      // @ts-ignore
      service!.createEngagement({
        CustomerName: 'dummy'
      })
        .then(() => done(new Error('Expecting method to fail')))
        .catch(e => expect(e).to.be.equals(EngagementsCrud.INVALID_REQUEST_OBJECT) && done())
    });
  
    it('must fail if a request object does not contain a `Description`', done => {
      // @ts-ignore
      service!.createEngagement({
        CustomerName: 'dummy',
        EngagementName: 'dummy'
      })
        .then(() => done(new Error('Expecting method to fail')))
        .catch(e => expect(e).to.be.equals(EngagementsCrud.INVALID_REQUEST_OBJECT) && done())
    });
  });


  describe('when providing valid configuration', () => {
    it('Must create a valid request to dynamo', done => {
      const service = new EngagementsCrud({
        UserId: '123',
        TeamId: '123',
        EngagementsTableName: 'dummy',
        AwsRegion: 'dummy',
        DocumentClient: {
          // @ts-ignore
          put: (request: PutItemInput) => ({
            async promise() {
              expect(request.TableName).to.equals('dummy');
              expect(request.Item.CustomerName).to.equals('dummy');
              expect(request.Item.EngagementName).to.equals('dummy');
              expect(request.Item.Description).to.equals('Dummy engagement');
              expect(request.Item.Id).not.to.be.undefined;
              expect(request.Item.UserId).to.equals('123');
              expect(request.Item.TeamId).to.equals('123');
              done();
            }
          })
        }
      });
      
      service!.createEngagement({
        CustomerName: 'dummy',
        EngagementName: 'dummy',
        Description: 'Dummy engagement'
      });
    });

    it('Must return a valid engagement as output', async () => {
      const service = new EngagementsCrud({
        UserId: '123',
        TeamId: '123',
        EngagementsTableName: 'dummy',
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
      
      const engagement = await service!.createEngagement({
        CustomerName: 'dummy',
        EngagementName: 'dummy',
        Description: 'Dummy engagement'
      });

      expect(engagement.Id).not.to.be.undefined;
      expect(engagement.UserId).to.equals('123');
      expect(engagement.TeamId).to.equals('123');
      expect(engagement.CustomerName).to.equals('dummy');
      expect(engagement.EngagementName).to.equals('dummy');
      expect(engagement.Description).to.equals('Dummy engagement');
    });

  });
})