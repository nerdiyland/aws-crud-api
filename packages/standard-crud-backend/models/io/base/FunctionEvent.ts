import { CreateItemRequest } from './contracts/CreateItemRequest';
import { ListItemsRequest } from './contracts/ListItemsRequest';

export type PossibleRequestInput = CreateItemRequest | ListItemsRequest<any>; // TODO Other possibilities

export interface FunctionEventParams {
  /**
   * Identifier used for individual operations
   */
  Id?: string;

  /**
   * Identifier of the user performing this application
   */
  UserId: string;

  /**
   * Name of the operation that the function must fulfill
   */
  OperationName: string;

  /**
   * Name of the schema that this API manages
   */
  EntitySchema?: string;

  /**
   * Name of the schema used as input for CREATE requests
   */
  InputSchema?: string;

  /**
   * Name of the field that the managed entity has as ID
   */
  IdFieldName?: string;

  /**
   * Name of the field used as Parent ID in the managed entity, if any
   */
  ParentFieldName?: string;

  /**
   * Optional alias to use for the function
   */
  IndexName?: string;

  /**
   * Type of list operation
   */
  ListType?: 'global' | 'owned';

  /**
   * List of fields of the item to include in the response
   */
  OutputFields?: string[];

  /**
   * If the request is delegated to a third party, ID of the user requesting it
   */
  InputUserId?: string;
}

export interface FunctionEvent<T extends PossibleRequestInput> {
  /**
   * Parameters to configure the function call
   */
  Params: FunctionEventParams;

  /**
   * Data sent to the function for usage
   */
  Data?: T;
}
