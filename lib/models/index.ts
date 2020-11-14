import { IResource, IRestApi, JsonSchema, RestApi } from "@aws-cdk/aws-apigateway";
import { AttributeType, ITable, Table } from "@aws-cdk/aws-dynamodb";
import { Function, IFunction } from "@aws-cdk/aws-lambda";

export interface BaseCrudApiProps {

    /**
     * Logical name for the component. It'd be used on outputs and other identifiers
     */
    ComponentName: string;
    
    /**
     * Defines the path for this API resource
     */
    ResourcePath: string;

    /**
     * Defines an existing API to create the resource into. If none is defined, an API will be created
     */
    Api?: RestApi;

    /**
     * Optionally, the parent resource for the global operations.
     * If none is set, the APIs root resource will be used.
     */
    GlobalParent?: IResource;

    /**
     * Optional parent resource for the individual operations.
     * If none is set, the global resource will be used.
     */
    IndividualParent?: IResource;
  
    /**
     * Table to use for CRUD operations. If none is given, a table will be created.
     * Tables must have only HashKey set to `Id` (string).
     */
    Table?: ITable;
  
    /**
     * Function that will take care of the backend operations for this resource
     */
    BackendFunction?: IFunction;
  
  
  }
  
  export interface BaseCrudApiTableConfigurationProps {
    HashKeyName: string;
    HashKeyType: AttributeType;
    SortKeyName?: string;
    SortKeyType?: AttributeType;
  }
  
  export interface BaseCrudApiOperations {
    Create?: BaseCrudApiOperationConfiguration;
    Read?: BaseCrudApiOperationConfiguration;
    List?: BaseCrudApiOperationConfiguration;
    Update?: BaseCrudApiOperationConfiguration;
    Delete?: BaseCrudApiOperationConfiguration;
  }
  
  export interface BaseCrudApiOperationConfiguration {
    OperationName: string;
    InputModel: BaseCrudApiOperationModelConfiguration;
    Responses: BaseCrudApiOperationResponseConfiguration[];
  }
  
  export interface BaseCrudApiOperationResponseConfiguration {
    StatusCode: string;
    MatchResponse?: RegExp | string;
    Model?: BaseCrudApiOperationModelConfiguration;
  }
  
  export interface BaseCrudApiOperationModelConfiguration {
    ModelName: string;
    Schema: JsonSchema;
  }