import { ItemsCrud } from './items-crud';
import { expect } from 'chai';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import * as sinon from 'sinon';

describe('Basic CRUD Operations Tests', () => {
  let itemsCrud: any;
  let mockDocumentClient: any;
  
  beforeEach(() => {
    // Create a stub DocumentClient
    mockDocumentClient = {
      put: sinon.stub(),
      get: sinon.stub(),
      scan: sinon.stub(),
      query: sinon.stub(),
      update: sinon.stub(),
      delete: sinon.stub(),
      batchGet: sinon.stub()
    };

    // Add promise() method to all stubs
    Object.keys(mockDocumentClient).forEach(method => {
      mockDocumentClient[method].returns({ promise: sinon.stub() });
    });
    
    // Setup ItemsCrud with mocked DocumentClient
    itemsCrud = new ItemsCrud({
      UserId: 'test-user-123',
      ItemsTableName: 'test-table',
      DocumentClient: mockDocumentClient,
      AwsRegion: 'us-east-1'
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('createItem', () => {
    it('should propagate DynamoDB errors', async () => {
      const mockItem = { name: 'Test Item' };
      const testError = new Error('DynamoDB put failed');

      // Configure the put mock to fail
      mockDocumentClient.put().promise.rejects(testError);

      try {
        await itemsCrud.createItem(mockItem);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.contain('DynamoDB put failed');
      }
    });
  });

  describe('listItems', () => {

    it('should handle empty scan results', async () => {
      // Configure the scan mock to return empty results
      mockDocumentClient.scan().promise.resolves({
        Items: [],
        Count: 0,
        ScannedCount: 0
      });

      const result = await itemsCrud.listItems({});

      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(0);
    });
  });

  describe('getItemById', () => {

    it('should throw error when item not found', async () => {
      // Configure the get mock to return no item
      mockDocumentClient.get().promise.resolves({});

      try {
        await itemsCrud.getItemById('non-existent-id');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.contain('not found');
      }
    });
  });

  describe('Constructor Validation', () => {
    it('should validate required configuration', () => {
      expect(() => new ItemsCrud(null as any)).to.throw('Invalid configuration');
      expect(() => new ItemsCrud({} as any)).to.throw('Invalid value provided for `UserId`');
      expect(() => new ItemsCrud({ UserId: 'test' } as any)).to.throw('No value has been given for the `ItemsTableName`');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate createItem input', async () => {
      try {
        await itemsCrud.createItem(null);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.contain('Invalid request object');
      }
    });

    it('should validate getItemById input', async () => {
      try {
        await itemsCrud.getItemById('');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.contain('Invalid `ItemId`');
      }
    });

    it('should validate updateItem input', async () => {
      try {
        await itemsCrud.updateItem('', null);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.contain('Invalid');
      }
    });

    it('should validate deleteItem input', async () => {
      try {
        await itemsCrud.deleteItem('');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.contain('Invalid `ItemId`');
      }
    });
  });
});
