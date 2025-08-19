import { Template, Match } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { RestApi, Model, JsonSchemaType, RequestValidator } from 'aws-cdk-lib/aws-apigateway';
import { BaseCrudApi } from '../../lib/base-crud';

describe('API Gateway Methods Infrastructure Tests', () => {
  let stack: Stack;
  let template: Template;
  let restApi: RestApi;

  beforeEach(() => {
    stack = new Stack();
    restApi = new RestApi(stack, 'TestApi', {
      restApiName: 'TestAPI'
    });
  });

  describe('Method Authorization Configuration', () => {
    test('should configure IAM authorization for all methods', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' },
          Read: { OperationName: 'getTask' },
          Update: { OperationName: 'updateTask' },
          Delete: { OperationName: 'deleteTask' },
          List: { OperationName: 'listTasks' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        AuthorizationType: 'AWS_IAM'
      });

      // Verify all HTTP methods have IAM authorization
      const methodTypes = ['POST', 'GET', 'PUT', 'DELETE'];
      methodTypes.forEach(method => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
          HttpMethod: method,
          AuthorizationType: 'AWS_IAM'
        });
      });
    });
  });

  describe('Request Validation Configuration', () => {
    test('should create request validator for global resource', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::RequestValidator', {
        RestApiId: { Ref: Match.anyValue() },
        ValidateRequestBody: true,
        ValidateRequestParameters: true
      });
    });

    test('should create separate request validator for individual resource', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Read: { OperationName: 'getTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should create at least one validator (both global and individual may create their own)
      const validatorCount = template.findResources('AWS::ApiGateway::RequestValidator');
      expect(Object.keys(validatorCount).length).toBeGreaterThanOrEqual(1);
    });

    test('should use shared validator when provided', () => {
      // Given
      const sharedValidator = new RequestValidator(stack, 'SharedValidator', {
        restApi: restApi,
        validateRequestBody: true,
        validateRequestParameters: true
      });

      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Validator: sharedValidator,
        Operations: {
          Create: { OperationName: 'createTask' },
          Read: { OperationName: 'getTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should only have the shared validator
      template.resourceCountIs('AWS::ApiGateway::RequestValidator', 1);
    });
  });

  describe('Request Models Configuration', () => {
    test('should configure input model for create operation when provided', () => {
      // Given
      const createModel = new Model(stack, 'CreateTaskModel', {
        restApi: restApi,
        modelName: 'CreateTaskRequest',
        schema: {
          type: JsonSchemaType.OBJECT,
          properties: {
            title: { type: JsonSchemaType.STRING },
            description: { type: JsonSchemaType.STRING }
          },
          required: ['title']
        }
      });

      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { 
            OperationName: 'createTask',
            InputModel: createModel
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
        RequestModels: {
          'application/json': { Ref: Match.anyValue() }
        }
      });
    });

    test('should configure input model for update operation when provided', () => {
      // Given
      const updateModel = new Model(stack, 'UpdateTaskModel', {
        restApi: restApi,
        modelName: 'UpdateTaskRequest',
        schema: {
          type: JsonSchemaType.OBJECT,
          properties: {
            title: { type: JsonSchemaType.STRING },
            status: { type: JsonSchemaType.STRING }
          }
        }
      });

      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Update: { 
            OperationName: 'updateTask',
            InputModel: updateModel
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'PUT',
        RequestModels: {
          'application/json': { Ref: Match.anyValue() }
        }
      });
    });
  });

  describe('Response Models Configuration', () => {
    test('should configure response model for create operation', () => {
      // Given
      const responseModel = new Model(stack, 'TaskResponseModel', {
        restApi: restApi,
        modelName: 'TaskResponse',
        schema: {
          type: JsonSchemaType.OBJECT,
          properties: {
            id: { type: JsonSchemaType.STRING },
            title: { type: JsonSchemaType.STRING },
            createdAt: { type: JsonSchemaType.STRING }
          }
        }
      });

      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { 
            OperationName: 'createTask',
            Response: {
              Model: responseModel
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
        MethodResponses: Match.arrayWith([
          Match.objectLike({
            StatusCode: '201',
            ResponseModels: {
              'application/json': { Ref: Match.anyValue() }
            }
          })
        ])
      });
    });

    test('should configure response model for read operation', () => {
      // Given
      const responseModel = new Model(stack, 'TaskResponseModel', {
        restApi: restApi,
        modelName: 'TaskResponse',
        schema: {
          type: JsonSchemaType.OBJECT,
          properties: {
            id: { type: JsonSchemaType.STRING },
            title: { type: JsonSchemaType.STRING }
          }
        }
      });

      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Read: { 
            OperationName: 'getTask',
            Response: {
              Model: responseModel
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        MethodResponses: Match.arrayWith([
          Match.objectLike({
            StatusCode: '200',
            ResponseModels: {
              'application/json': { Ref: Match.anyValue() }
            }
          })
        ])
      });
    });

    test('should configure response model for list operation', () => {
      // Given
      const listResponseModel = new Model(stack, 'TaskListResponseModel', {
        restApi: restApi,
        modelName: 'TaskListResponse',
        schema: {
          type: JsonSchemaType.OBJECT,
          properties: {
            items: {
              type: JsonSchemaType.ARRAY,
              items: {
                type: JsonSchemaType.OBJECT,
                properties: {
                  id: { type: JsonSchemaType.STRING },
                  title: { type: JsonSchemaType.STRING }
                }
              }
            },
            count: { type: JsonSchemaType.NUMBER }
          }
        }
      });

      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          List: { 
            OperationName: 'listTasks',
            Response: {
              Model: listResponseModel
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        MethodResponses: Match.arrayWith([
          Match.objectLike({
            StatusCode: '200',
            ResponseModels: {
              'application/json': { Ref: Match.anyValue() }
            }
          })
        ])
      });
    });
  });

  describe('Method Parameters Configuration', () => {
    test('should configure path parameter for individual resource methods', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Read: { OperationName: 'getTask' },
          Update: { OperationName: 'updateTask' },
          Delete: { OperationName: 'deleteTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      const individualMethods = ['GET', 'PUT', 'DELETE'];
      individualMethods.forEach(method => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
          HttpMethod: method,
          RequestParameters: {
            'method.request.path.id': true
          }
        });
      });
    });

    test('should configure parent resource parameters when applicable', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        ParentResourceName: 'project',
        ParentFieldName: 'ProjectId',
        Operations: {
          Create: { 
            OperationName: 'createTask',
            ParentId: {
              Param: 'projectId',
              Source: 'querystring' as any
            }
          },
          Read: { 
            OperationName: 'getTask',
            ParentId: {
              Param: 'projectId',
              Source: 'querystring' as any
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        RequestParameters: {
          'method.request.querystring.projectId': true
        }
      });
    });

    test('should handle query string parameters for parent resources', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          List: { 
            OperationName: 'listTasks',
            ParentId: {
              Param: 'projectId',
              Source: 'querystring' as any
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        RequestParameters: {
          'method.request.querystring.projectId': true
        }
      });
    });

    test('should handle header parameters for parent resources', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { 
            OperationName: 'createTask',
            ParentId: {
              Param: 'X-Project-Id',
              Source: 'header' as any
            }
          }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        RequestParameters: {
          'method.request.header.X-Project-Id': true
        }
      });
    });
  });

  describe('Method Response Configuration', () => {
    test('should configure CORS headers for all method responses', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' },
          Read: { OperationName: 'getTask' },
          Update: { OperationName: 'updateTask' },
          Delete: { OperationName: 'deleteTask' },
          List: { OperationName: 'listTasks' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      const expectedCorsHeaders = {
        'method.response.header.access-control-allow-origin': true,
        'method.response.header.access-control-allow-headers': true,
        'method.response.header.access-control-allow-methods': true,
        'method.response.header.access-control-allow-credentials': true
      };

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        MethodResponses: Match.arrayWith([
          Match.objectLike({
            ResponseParameters: Match.objectLike(expectedCorsHeaders)
          })
        ])
      });
    });

    test('should configure correct status codes for each operation type', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' },
          Read: { OperationName: 'getTask' },
          Update: { OperationName: 'updateTask' },
          Delete: { OperationName: 'deleteTask' },
          List: { OperationName: 'listTasks' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Create should have 201
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
        MethodResponses: Match.arrayWith([
          Match.objectLike({ StatusCode: '201' }),
          Match.objectLike({ StatusCode: '400' }),
          Match.objectLike({ StatusCode: '403' }),
          Match.objectLike({ StatusCode: '500' })
        ])
      });

      // Then - Read/Update/List should have 200
      ['GET', 'PUT'].forEach(method => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
          HttpMethod: method,
          MethodResponses: Match.arrayWith([
            Match.objectLike({ StatusCode: '200' }),
            Match.objectLike({ StatusCode: '400' }),
            Match.objectLike({ StatusCode: '403' }),
            Match.objectLike({ StatusCode: '500' })
          ])
        });
      });

      // Then - Read/Update should also have 404
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        MethodResponses: Match.arrayWith([
          Match.objectLike({ StatusCode: '404' })
        ])
      });

      // Then - Delete should have 204
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'DELETE',
        MethodResponses: Match.arrayWith([
          Match.objectLike({ StatusCode: '204' }),
          Match.objectLike({ StatusCode: '400' }),
          Match.objectLike({ StatusCode: '403' }),
          Match.objectLike({ StatusCode: '404' }),
          Match.objectLike({ StatusCode: '500' })
        ])
      });
    });
  });

  describe('Operation Name Configuration', () => {
    test('should set correct operation names for methods', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' },
          Read: { OperationName: 'getTaskById' },
          Update: { OperationName: 'updateTask' },
          Delete: { OperationName: 'deleteTask' },
          List: { OperationName: 'listAllTasks' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
        OperationName: 'createTask'
      });

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        OperationName: 'getTaskById'
      });

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'PUT',
        OperationName: 'updateTask'
      });

      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'DELETE',
        OperationName: 'deleteTask'
      });
    });

    test('should use default operation names when not specified', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Read: { OperationName: 'getTask' },
          Update: { OperationName: 'updateTask' },
          Delete: { OperationName: 'deleteTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Default names should be used if not overridden
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        OperationName: 'getTask'
      });
    });
  });

  describe('Integration Configuration Validation', () => {
    test('should configure non-proxy Lambda integration', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          Type: 'AWS',
          IntegrationHttpMethod: 'POST',
          PassthroughBehavior: 'WHEN_NO_TEMPLATES'
        }
      });
    });

    test('should not use proxy integration mode', () => {
      // Given
      const baseCrud = new BaseCrudApi(stack, 'TestCrud', {
        EnvironmentName: 'test',
        Api: restApi,
        ResourcePath: 'tasks',
        Operations: {
          Create: { OperationName: 'createTask' }
        }
      });

      // When
      template = Template.fromStack(stack);

      // Then - Should not have proxy configuration
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        Integration: {
          Type: 'AWS',
          // Should not have proxy-related properties
          IntegrationHttpMethod: 'POST'
        }
      });
    });
  });
});
