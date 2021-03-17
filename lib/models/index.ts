import { IResource, JsonSchema, Model, RestApi } from "@aws-cdk/aws-apigateway";
import { AttributeType, ITable } from "@aws-cdk/aws-dynamodb";
import { IFunction } from "@aws-cdk/aws-lambda";
import { Duration } from "@aws-cdk/core";

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
   * Optional name of the id field in the API definition. This is required if you're using parent-based resources
   */
  IdFieldName?: string;

  /**
   * Optional name of the ParentId field, to use in the tables
   */
  ParentFieldName?: string;

  /**
   * Optional name for the {id} field in the api resource. By default it's set to `id`
   */
  IdResourceName?: string; 

  /**
   * Optional name for the id of this resource's parent.
   */
  ParentResourceName?: string;

  /**
   * Table to use for CRUD operations. If none is given, a table will be created.
   * Tables must have only HashKey set to `Id` (string).
   */
  Table?: ITable;

  /**
   * Function that will take care of the backend operations for this resource
   */
  BackendFunction?: IFunction;

  /**
   * Memory to assign backend function
   */
  BackendMemory?: number;

  /**
   * Backend timeout duration
   */
  BackendTimeout?: Duration;

  /**
   * Defines the operations that this API should enable consumers to use
   */
  Operations: BaseCrudApiOperations;

  /**
   * Name of the schema that this api should manage
   */
  EntitySchema?: string;
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
  ListOwned?: BaseCrudApiOperationConfiguration;
  Update?: BaseCrudApiOperationConfiguration;
  Delete?: BaseCrudApiOperationConfiguration;
}

export interface BaseCrudApiOperationConfiguration {
  OperationName: string;
  IndexName?: string;
  InputModel?: Model;
  Response?: BaseCrudApiOperationResponseConfiguration;
  BackendFunction?: IFunction;
}

export interface BaseCrudApiOperationResponseConfiguration {
  StatusCode?: string;
  Fields?: string[];
  MatchResponse?: RegExp | string;
  Model?: Model;
}

export interface BaseCrudApiOperationModelConfiguration {
  ModelName: string;
  Schema: JsonSchema;
}