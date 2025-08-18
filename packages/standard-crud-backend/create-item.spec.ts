import { ItemsCrud } from './items-crud';
import { expect } from 'chai';
import { PutItemInput } from '@aws-sdk/client-dynamodb';
import { PropertyGenerator } from './models/base/ExtendedSchema';
import { DataType } from './models/base';

describe('The `createItem` method of the items CRUD service', () => {
  let service: ItemsCrud<any, any, any, any, any> | null = null;

  beforeEach(() => {
    service = new ItemsCrud({
      UserId: '123',
      ItemsTableName: 'dummy',
      AwsRegion: 'dummy',
    });
  });

  describe('when providing invalid configuration', () => {
    it('must fail if a request object is not provided', done => {
      // @ts-ignore
      service!
        .createItem(null)
        .then(() => done(new Error('Expecting method to fail')))
        .catch(e => expect(e).to.be.equals(ItemsCrud.INVALID_REQUEST_OBJECT) && done());
    });

    // TODO Data model validation tests
  });
});
