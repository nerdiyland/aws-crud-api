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
    it('should call DynamoDB put with correct parameters', async () => {
      const mockItem = {
        name: 'Test Item',
        description: 'A test item for CRUD operations'
      };

      // Configure the put mock to succeed
      mockDocumentClient.put().promise.resolves({});

      const result = await itemsCrud.createItem(mockItem);

      // Verify put was called
      expect(mockDocumentClient.put.calledOnce).to.be.true;
      
      // Verify the parameters passed to put
      const putCall = mockDocumentClient.put.getCall(0);
      const putParams = putCall.args[0];
      
      expect(putParams.TableName).to.equal('test-table');
      expect(putParams.Item.name).to.equal('Test Item');
      expect(putParams.Item.description).to.equal('A test item for CRUD operations');
      
      // Verify result contains input data
      expect(result).to.be.an('object');
      expect(result.name).to.equal('Test Item');
      expect(result.description).to.equal('A test item for CRUD operations');
    });

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
    it('should call DynamoDB scan and return items', async () => {
      const mockItems = [
        { Id: 'item-1', UserId: 'test-user-123', name: 'Item 1' },
        { Id: 'item-2', UserId: 'test-user-123', name: 'Item 2' }
      ];

      // Configure the scan mock
      mockDocumentClient.scan().promise.resolves({
        Items: mockItems,
        Count: mockItems.length,
        ScannedCount: mockItems.length
      });

      const result = await itemsCrud.listItems({});

      // Verify scan was called
      expect(mockDocumentClient.scan.calledOnce).to.be.true;
      
      // Verify the parameters passed to scan
      const scanCall = mockDocumentClient.scan.getCall(0);
      const scanParams = scanCall.args[0];
      expect(scanParams.TableName).to.equal('test-table');
      
      // Verify result
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(2);
    });

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
    it('should call DynamoDB get and return item', async () => {
      const mockItem = {
        Id: 'test-item-id',
        UserId: 'test-user-123',
        name: 'Test Item'
      };

      // Configure the get mock
      mockDocumentClient.get().promise.resolves({ Item: mockItem });

      const result = await itemsCrud.getItemById('test-item-id');

      // Verify get was called
      expect(mockDocumentClient.get.calledOnce).to.be.true;
      
      // Verify the parameters passed to get
      const getCall = mockDocumentClient.get.getCall(0);
      const getParams = getCall.args[0];
      expect(getParams.TableName).to.equal('test-table');
      expect(getParams.Key.Id).to.equal('test-item-id');
      
      // Verify result
      expect(result).to.be.an('object');
      expect(result.Id).to.equal('test-item-id');
      expect(result.name).to.equal('Test Item');
    });

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

  describe('updateItem', () => {
    it('should call DynamoDB update after security check', async () => {
      const existingItem = {
        Id: 'test-item-id',
        UserId: 'test-user-123',
        name: 'Original Name'
      };

      const updatedItem = {
        ...existingItem,
        name: 'Updated Name'
      };

      const updateRequest = { name: 'Updated Name' };

      // Configure mocks - first get for security check, update, then get for final result
      mockDocumentClient.get().promise
        .onFirstCall().resolves({ Item: existingItem })
        .onSecondCall().resolves({ Item: updatedItem });
      
      mockDocumentClient.update().promise.resolves({});

      const result = await itemsCrud.updateItem('test-item-id', updateRequest);

      // Verify get was called for security check
      expect(mockDocumentClient.get.calledTwice).to.be.true;
      
      // Verify update was called
      expect(mockDocumentClient.update.calledOnce).to.be.true;
      
      const updateCall = mockDocumentClient.update.getCall(0);
      const updateParams = updateCall.args[0];
      expect(updateParams.TableName).to.equal('test-table');
      expect(updateParams.Key.Id).to.equal('test-item-id');
      
      // Verify result
      expect(result).to.be.an('object');
      expect(result.name).to.equal('Updated Name');
    });
  });

  describe('deleteItem', () => {
    it('should call DynamoDB delete after security check', async () => {
      const existingItem = {
        Id: 'test-item-id',
        UserId: 'test-user-123',
        name: 'Item to Delete'
      };

      // Configure mocks
      mockDocumentClient.get().promise.resolves({ Item: existingItem });
      mockDocumentClient.delete().promise.resolves({});

      await itemsCrud.deleteItem('test-item-id');

      // Verify get was called for security check
      expect(mockDocumentClient.get.calledOnce).to.be.true;
      
      // Verify delete was called
      expect(mockDocumentClient.delete.calledOnce).to.be.true;
      
      const deleteCall = mockDocumentClient.delete.getCall(0);
      const deleteParams = deleteCall.args[0];
      expect(deleteParams.TableName).to.equal('test-table');
      expect(deleteParams.Key.Id).to.equal('test-item-id');
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
