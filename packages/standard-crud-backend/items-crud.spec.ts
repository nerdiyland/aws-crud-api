import { ItemsCrud } from './items-crud';
import { expect } from 'chai';

describe('The items CRUD service', () => {
  it('should fail if no configuration is given upon construction', () => {
    // @ts-ignore
    expect(() => new ItemsCrud()).to.throw(ItemsCrud.INVALID_CONFIGURATION_EXCEPTION);
  });

  it('should fail if no `UserId` is given', () => {
    // @ts-ignore
    expect(() => new ItemsCrud({
      ItemsTableName: 'dummy'
    })).to.throw(ItemsCrud.INVALID_USER_ID_EXCEPTION);
  });

  it('should fail if no `ItemsTableName` is given', () => {
    // @ts-ignore
    expect(() => new ItemsCrud({
      UserId: '123',
    })).to.throw(ItemsCrud.NO_ITEMS_TABLE_EXCEPTION);
  });

  it('should expose public CRUD methods', () => {
    const service = new ItemsCrud({
      UserId: '123',
      ItemsTableName: 'dummy'
    });

    // @ts-ignore
    expect(service.createItem).to.not.be.undefined;
    // @ts-ignore
    expect(service.listItems).to.not.be.undefined;
  });
})