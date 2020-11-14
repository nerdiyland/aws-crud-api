import { JsonSchema } from "@aws-cdk/aws-apigateway";
import { AttributeType, Table } from "@aws-cdk/aws-dynamodb";
import { Function } from "@aws-cdk/aws-lambda";

export interface BaseCrudApiProps {

    /**
     * Logical name for the component. It'd be used on outputs and other identifiers
     */
    ComponentName: string;
    
    /**
     * Defines the path for this API resource's global operations - i.e. Create, List
     */
    GlobalPathPart: string;
  
    /**
     * Defines the path for this API resource's individual operations - i.e. Get, Update, Delete
     */
    UniquePathPart: string;
  
    /**
     * Configures how the table that this API is backed by will be structured and created.
     * Optionally, it can receive an instantiated DynamoDB table that will be used instead.
     */
    TableConfiguration?: Table | BaseCrudApiTableConfigurationProps;
  
    /**
     * Function that will take care of the backend operations for this resource
     */
    BackendFunction: Function;
  
  
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