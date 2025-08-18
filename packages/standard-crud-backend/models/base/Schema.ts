import { DataType } from './DataTypes';
import { StandaloneObject } from './StandaloneObject';

export enum SchemaOwner {
  ACCOUNT = 'account',
  VARIABLE = 'variable',
}

export interface Schema extends StandaloneObject {
  /**
   * If this is not a core schema, type of entity that owns it.
   * This works in conjunction with the `OwnerId` field, to properly identify the owner of a given schema.
   */
  Owner?: SchemaOwner;

  /**
   * The ID of the owner of this schema.
   * This value is null for Core schemas, and it's set to the owner's ID in other cases - e.g. accounts and variables.
   */
  OwnerId?: string;
}

// TODO
export interface JSONSchema extends Schema {
  /**
   * Schema reference
   */
  $ref?: string;

  /**
   * Default value
   * @label entities.ExtendedJSONSchema.properties.default.label
   * @summary entities.ExtendedJSONSchema.properties.default.description
   * @placeholder entities.ExtendedJSONSchema.properties.default.placeholder
   * @fieldType text
   */
  default?: string;

  /**
   * Type of information that this schema manages
   * @label entities.ExtendedJSONSchema.properties.type.label
   * @summary entities.ExtendedJSONSchema.properties.type.description
   * @placeholder entities.ExtendedJSONSchema.properties.type.placeholder
   * @fieldType select
   */
  type?: DataType;

  /**
   * Description of the data type
   * @label entities.ExtendedJSONSchema.properties.description.label
   * @summary entities.ExtendedJSONSchema.properties.description.description
   * @placeholder entities.ExtendedJSONSchema.properties.description.placeholder
   * @maxLength 1024
   * @minLength 2
   * @fieldType textarea
   * @rows 4
   */
  description?: string;

  /**
   * Name of the data type
   * @label entities.ExtendedJSONSchema.properties.name.label
   * @summary entities.ExtendedJSONSchema.properties.name.description
   * @placeholder entities.ExtendedJSONSchema.properties.name.placeholder
   * @maxLength 64
   * @minLength 2
   * @fieldType text
   */
  name?: string;

  /**
   * Defines how many rows text areas would have.
   * @label entities.ExtendedJSONSchema.properties.rows.label
   * @summary entities.ExtendedJSONSchema.properties.rows.description
   * @placeholder entities.ExtendedJSONSchema.properties.rows.placeholder
   * @min 1
   * @precision 1
   * @fieldType number
   */
  rows?: number;

  /**
   * Defines the minimum value that numbers can have
   * @label entities.ExtendedJSONSchema.properties.min.label
   * @summary entities.ExtendedJSONSchema.properties.min.description
   * @placeholder entities.ExtendedJSONSchema.properties.min.placeholder
   * @min 1
   * @precision 1
   * @fieldType number
   */
  min?: number;

  /**
   * Defines the maximum value that numbers can have
   * @label entities.ExtendedJSONSchema.properties.max.label
   * @summary entities.ExtendedJSONSchema.properties.max.description
   * @placeholder entities.ExtendedJSONSchema.properties.max.placeholder
   * @min 1
   * @precision 1
   * @fieldType number
   */
  max?: number;

  /**
   * Defines the precision of numbers (i.e. the step it increases or decreases)
   * @label entities.ExtendedJSONSchema.properties.precision.label
   * @summary entities.ExtendedJSONSchema.properties.precision.description
   * @placeholder entities.ExtendedJSONSchema.properties.precision.placeholder
   * @fieldType number
   */
  precision?: number;

  /**
   * Defines the minimum length of strings or arrays
   * @label entities.ExtendedJSONSchema.properties.minLength.label
   * @summary entities.ExtendedJSONSchema.properties.minLength.description
   * @placeholder entities.ExtendedJSONSchema.properties.minLength.placeholder
   * @min 1
   * @precision 1
   * @fieldType number
   */
  minLength?: number;

  /**
   * Defines the maximum length of strings or arrays
   * @label entities.ExtendedJSONSchema.properties.maxLength.label
   * @summary entities.ExtendedJSONSchema.properties.maxLength.description
   * @placeholder entities.ExtendedJSONSchema.properties.maxLength.placeholder
   * @min 1
   * @precision 1
   * @fieldType number
   */
  maxLength?: number;

  /**
   * Pattern that string values must match
   * @label entities.ExtendedJSONSchema.properties.pattern.label
   * @summary entities.ExtendedJSONSchema.properties.pattern.description
   * @placeholder entities.ExtendedJSONSchema.properties.pattern.placeholder
   * @maxLength 64
   * @minLength 2
   * @fieldType text
   */
  pattern?: string;

  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  allOf?: JSONSchema[];
  $id?: string;
}
