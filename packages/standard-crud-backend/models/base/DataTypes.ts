/**
 * Enumeration of all possible basic data types supported by the CRUD API
 */
export enum DataType {
  ANY = 'any',

  /**
   * String type. The data is a text.
   */
  STRING = 'string',

  /**
   * Number type. The data is a number.
   */
  NUMBER = 'number',

  /**
   * Boolean type
   */
  BOOLEAN = 'boolean',

  /**
   * Date type. Date is formatted by standard to YYYY-MM-DD HH:mm:ss.SSS
   */
  DATE = 'date',

  /**
   * Data is a list of items.
   * Further configuration may be required to understand the type of items that the array can store.
   */
  ARRAY = 'array',

  /**
   * Data is an object.
   */
  OBJECT = 'object',
}
