import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IResource, JsonSchema, Model, RequestValidator, RestApi } from "aws-cdk-lib/aws-apigateway";
import { AttributeType, ITable } from "aws-cdk-lib/aws-dynamodb";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";

export interface BaseCrudApiProps {

  /**
   * Iot endpoint address for the solution
   * If none is used, an export will be tried and fetched from cloudformation
   */
  IotEndpointAddress?: string;

  /**
   * Logical name for the component. It'd be used on outputs and other identifiers
   */
  ComponentName?: string;
  
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
   * Optional location where to fetch the UserId from. By default, Cognito credentials are used.
   */
  UserId?: string;

  /**
   * Table to use for CRUD operations. If none is given, a table will be created.
   * Tables must have only HashKey set to `Id` (string).
   */
  Table?: ITable;

  /**
   * Bucket to store large data
   */
  Bucket?: IBucket;

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

  /**
   * Optional validator for the API resource
   */
  Validator?: RequestValidator;

  /**
   * Determines which fields of the resource's model shall be stored and retrieved from S3
   * This is useful when APIs handle a resource that stores large data as part of the contract
   */
  S3Fields?: { [key: string]: BaseCrudApiOperationS3FieldConfiguration }
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
  SuccessEvent?: string;
  ParentId?: BaseCrudApiOperationParentConfiguration;
}

export enum BaseCrudApiParameterSource {
  PATH = 'path',
  QUERYSTRING = 'querystring',
  HEADER = 'header'
}

export interface BaseCrudApiOperationParentConfiguration {
  Param: string;
  Source: BaseCrudApiParameterSource;
}

export interface BaseCrudApiOperationS3FieldConfiguration {
  Prefix?: string;
  DataFormat?: 'json' | 'TODO'; // TODO Add types
  // TODO Add other properties
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