import { StandaloneObject } from "../../../base/StandaloneObject";

export interface ListItemsResponse<T extends StandaloneObject> extends Array<T> {

  /**
   * Paging mechanics. If set, its value could be used as cursor for the next request
   */
  Next?: string;

  /**
   * Number of items returned by this operation
   */
  Count: number;
}