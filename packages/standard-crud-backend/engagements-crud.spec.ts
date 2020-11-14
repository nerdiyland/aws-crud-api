import { EngagementsCrud } from './engagements-crud';
import { expect } from 'chai';

describe('The engagements CRUD service', () => {
  it('should fail if no configuration is given upon construction', () => {
    // @ts-ignore
    expect(() => new EngagementsCrud()).to.throw(EngagementsCrud.INVALID_CONFIGURATION_EXCEPTION);
  });

  it('should fail if no `UserId` is given', () => {
    // @ts-ignore
    expect(() => new EngagementsCrud({
      TeamId: '123',
      EngagementsTableName: 'dummy'
    })).to.throw(EngagementsCrud.INVALID_USER_ID_EXCEPTION);
  });

  it('should fail if no `TeamId` is given', () => {
    // @ts-ignore
    expect(() => new EngagementsCrud({
      UserId: '123',
      EngagementsTableName: 'dummy'
    })).to.throw(EngagementsCrud.INVALID_TEAM_ID_EXCEPTION);
  });

  it('should fail if no `EngagementsTableName` is given', () => {
    // @ts-ignore
    expect(() => new EngagementsCrud({
      UserId: '123',
      TeamId: '123'
    })).to.throw(EngagementsCrud.NO_ENGAGEMENTS_TABLE_EXCEPTION);
  });

  it('should expose public CRUD methods', () => {
    const service = new EngagementsCrud({
      UserId: '123',
      TeamId: '123',
      EngagementsTableName: 'dummy'
    });

    // @ts-ignore
    expect(service.createEngagement).to.not.be.undefined;
    // @ts-ignore
    expect(service.listEngagements).to.not.be.undefined;
  });
})