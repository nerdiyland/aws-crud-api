export interface ListItemsRequest<T> {
  /**
   * Filters to apply to the list
   */
  Filters: T;

  /**
   * Paging mechanics. If set, its value will be used as cursor in the database
   */
  StartAt?: string;
}
