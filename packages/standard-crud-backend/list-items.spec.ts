import { ItemsCrud } from './items-crud';
import { expect } from 'chai';
import { QueryInput } from '@aws-sdk/client-dynamodb';

describe('The `listItems` method of the items CRUD service', () => {
  it('must attempt to connect to Dynamo for scanning items', done => {
    const service = new ItemsCrud({
      UserId: '123',
      ItemsTableName: 'dummy',
      AwsRegion: 'dummy',
      DynamoDB: {
        // @ts-ignore
        scan: async (request: any) => {
          expect(request.TableName).to.equals('dummy');
          done();

          return {
            Items: [],
          };
        },
      },
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
        DynamoDB: {
          // @ts-ignore
          query: async (request: QueryInput) => {
            expect((request.ExpressionAttributeNames as any)['#parentId']).to.be.equals(
              'MyParentId'
            );
            expect((request.ExpressionAttributeValues as any)[':parentId']?.S).to.be.equals('1234'); // v3 uses AttributeValue format
            done();

            return {
              Items: [],
            };
          },
        },
      });

      service!.listItems();
    });
  });
});
