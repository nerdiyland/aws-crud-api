# Aftersignals Base CRUD API

Welcome to our `Base CRUD API` project! As its very original name implies, this package enables you to create CRUD features on any API, and offers you many customization options so you can fine-tune your API methods to your needs!

## Architecture

![Base Crud Architecture](static/base-crud.png)

The architecture of this module is essentially a REST API - created with Amazon API Gateway - featuring standard methods for CRUD operations. These methods come defined right out-of-the-box, so you only need to configure exactly the features you need for each resource.

## Developer manual

### Creating an API

If you're getting started with an API for a platform feature or a solution, please take a look to TODO Create base-api module

### Creating a resource

Once you have your API defined, is time to create your resources. A resource is basically a domain where you want to define CRUD methods - e.g. `vehicles`, `users`, and so on. You will need to create one of these for each type of object you want to manage.

```typescript
const catalogOperationsCrud = new BaseCrudApi(this, 'OperationsCRUD', {
  Api: this.api, // Link the resource with your API
  ComponentName: 'MarketplaceAPI', // TODO deprecate
  ResourcePath: 'operations', // Path to your resource
  GlobalParent: this.api.root, // Parent resource for this resource

  // Define the operations of your API
  Operations: {
    Create: {
      OperationName: 'createOperation',
      ...
    },
    ListOwned: {
      IndexName: 'ByUserId',
      OperationName: 'listOperations',
      ...
    },
    Update: {
      OperationName: 'updateOperation',
      ...
    }
  }
});
```

#### Resource methods

When your users interact with your new API resource, they do so through the configured methods. This package has out-of-the-box support for these methods, or types of methods:

* `List` enables users to read the full set of data stored in this resource's backend storage. This is useful for public catalogs or shared data sources, where users would need to see all data.
* `ListOwned` fetches owned items from the table. This is useful to create API list methods to allow each user to manage their own entities
* `Create` adds an item to the table
* `Get` reads an item from the table
* `Update` updates an item in the table
* `Delete` deletes an item from the table

#### Method configuration

Each method TODO

### DynamoDB vs S3 storage

By default, this module creates resources for DynamoDB-backed operations, so the data of your entities will eventually be stored there. However, for endpoints requiring the transmission and storage of S3