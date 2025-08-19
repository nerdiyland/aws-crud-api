import { DataClassification } from './DataClassification';
import { JSONSchema } from './Schema';

/**
 * Available generators that will automatically assign a value to your properties
 */
export enum PropertyGenerator {
  /**
   * Universal Unique Identifier. When this format is set, the Scaffold system will assign a random UUID to the property
   */
  UUID = '$uuid',

  /**
   * Formatted date with the universal format - i.e. YYYY-MM-DD HH:mm:ss.SSS
   */
  FORMATTED_DATE = '$formattedDate',

  TIMESTAMP = '$timestamp',

  RANDOM_COLOR = '$randomColor',
}

export enum TextBoolean {
  YES = 'yes',
  NO = 'no',
}

export interface ExtendedJSONSchema extends JSONSchema {
  /**
   * Generator used to automatically assign a dynamic value to this field
   * @label entities.ExtendedJSONSchema.properties.generator.label
   * @summary entities.ExtendedJSONSchema.properties.generator.description
   * @placeholder entities.ExtendedJSONSchema.properties.generator.placeholder
   * @fieldType select
   */
  generator?: PropertyGenerator;

  /**
   * Form label
   * @label entities.ExtendedJSONSchema.properties.label.label
   * @summary entities.ExtendedJSONSchema.properties.label.description
   * @placeholder entities.ExtendedJSONSchema.properties.label.placeholder
   * @maxLength 64
   * @minLength 2
   * @pattern ^[a-zA-Z][a-zA-Z0-9 \-_:]+[a-zA-Z]$
   * @fieldType text
   */
  label?: string;

  /**
   * Form placeholder
   * @label entities.ExtendedJSONSchema.properties.placeholder.label
   * @summary entities.ExtendedJSONSchema.properties.placeholder.description
   * @placeholder entities.ExtendedJSONSchema.properties.placeholder.placeholder
   * @maxLength 64
   * @minLength 2
   * @pattern ^[a-zA-Z][a-zA-Z0-9 \-_:]+[a-zA-Z]$
   * @fieldType text
   */
  placeholder?: string;

  /**
   * Whether the schema should not be published by the API
   */
  private?: TextBoolean;

  /**
   * schema properties
   */
  properties?: { [key: string]: ExtendedJSONSchema };

  /**
   * Whether the field should be readonly
   * @label entities.ExtendedJSONSchema.properties.readonly.label
   * @summary entities.ExtendedJSONSchema.properties.readonly.description
   * @placeholder entities.ExtendedJSONSchema.properties.readonly.placeholder
   * @fieldType select
   */
  readonly?: TextBoolean;

  /**
   * Schema summary or description. This differs from description as description is directly generated from code,
   * whilst summary is used in forms, and can store placeholders of i18n labels while keeping the code readable.
   * TODO Get rid of this
   */
  summary?: string;

  /**
   * Defines the items inside an array
   * @label entities.ExtendedJSONSchema.properties.items.label
   * @summary entities.ExtendedJSONSchema.properties.items.description
   * @placeholder entities.ExtendedJSONSchema.properties.items.placeholder
   */
  items?: ExtendedJSONSchema;

  /**
   * Form hint. Text that will be shown alongside the field to help users
   * @label entities.ExtendedJSONSchema.properties.hint.label
   * @summary entities.ExtendedJSONSchema.properties.hint.description
   * @placeholder entities.ExtendedJSONSchema.properties.hint.placeholder
   * @maxLength 64
   * @minLength 2
   * @fieldType text
   */
  hint?: string;

  /**
   * Form/Field/Item category. Used in forms to separate items
   * @label entities.ExtendedJSONSchema.properties.category.label
   * @summary entities.ExtendedJSONSchema.properties.category.description
   * @placeholder entities.ExtendedJSONSchema.properties.category.placeholder
   * @fieldType text
   */
  category?: string;

  /**
   * Defines whether this property is required
   * @label entities.ExtendedJSONSchema.properties.required.label
   * @summary entities.ExtendedJSONSchema.properties.required.description
   * @placeholder entities.ExtendedJSONSchema.properties.required.placeholder
   * @fieldType switch
   */
  required?: boolean;

  /**
   * Defines whether an input should be ignored by the engine
   * @label entities.ExtendedJSONSchema.properties.ignored.label
   * @summary entities.ExtendedJSONSchema.properties.ignored.description
   * @placeholder entities.ExtendedJSONSchema.properties.ignored.placeholder
   * @fieldType switch
   */
  ignored?: boolean;

  /**
   * Whether this field is part of the auth material
   * @label entities.ExtendedJSONSchema.properties.IsAuthMaterial.label
   * @summary entities.ExtendedJSONSchema.properties.IsAuthMaterial.description
   * @placeholder entities.ExtendedJSONSchema.properties.IsAuthMaterial.placeholder
   * @fieldType switch
   */
  IsAuthMaterial?: boolean;

  /**
   * What field from the auth material should this input be linked to
   * @label entities.ExtendedJSONSchema.properties.AuthMaterialField.label
   * @summary entities.ExtendedJSONSchema.properties.AuthMaterialField.description
   * @placeholder entities.ExtendedJSONSchema.properties.AuthMaterialField.placeholder
   */
  AuthMaterialField?: string;

  /**
   * In case this field relates with a variable, this field should be the id the of the variable
   * @label entities.ExtendedJSONSchema.properties.Variable.label
   * @summary entities.ExtendedJSONSchema.properties.Variable.description
   * @placeholder entities.ExtendedJSONSchema.properties.Variable.placeholder
   * @type "$variable"
   * @fieldType select
   */
  Variable?: string;

  /**
   * In case this field relates with a variable, this field should define which field in the variable to use for labelling elements
   * @label entities.ExtendedJSONSchema.properties.VariableLabelField.label
   * @summary entities.ExtendedJSONSchema.properties.VariableLabelField.description
   * @placeholder entities.ExtendedJSONSchema.properties.VariableLabelField.placeholder
   */
  VariableLabelField?: string;

  /**
   * In case this field is an object or array, the fields to show from it
   * @label entities.ExtendedJSONSchema.properties.Fields.label
   * @summary entities.ExtendedJSONSchema.properties.Fields.description
   * @placeholder entities.ExtendedJSONSchema.properties.Fields.placeholder
   * @type array
   * @items string
   */
  fields?: string[];

  /**
   * In case this field is an object or array, the fields to show from it when listing the schema
   * @label entities.ExtendedJSONSchema.properties.ArrayListFields.label
   * @summary entities.ExtendedJSONSchema.properties.ArrayListFields.description
   * @placeholder entities.ExtendedJSONSchema.properties.ArrayListFields.placeholder
   * @type array
   * @items string
   */
  arrayListFields?: string[];

  /**
   * In case this field is an object or array, the fields to show from it when viewing details from the schema
   * @label entities.ExtendedJSONSchema.properties.ArrayDetailFields.label
   * @summary entities.ExtendedJSONSchema.properties.ArrayDetailFields.description
   * @placeholder entities.ExtendedJSONSchema.properties.ArrayDetailFields.placeholder
   * @type array
   * @items string
   */
  arrayDetailFields?: string[];

  /**
   * Allowed options for an input. Useful for `select` components
   * @label entities.ExtendedJSONSchema.properties.Options.label
   * @summary entities.ExtendedJSONSchema.properties.Options.description
   * @placeholder entities.ExtendedJSONSchema.properties.Options.placeholder
   */
  options?: ExtendedSchemaFieldOption[];

  /**
   * Data classification configuration
   * @label entities.ExtendedJSONSchema.properties.DataClassification.label
   * @summary entities.ExtendedJSONSchema.properties.DataClassification.summary
   */
  DataClassification?: DataClassification;
}

export interface ExtendedSchemaFieldOption {
  /**
   * @label entities.ExtendedSchemaFieldOption.properties.label.label
   */
  label: string;

  /**
   * @label entities.ExtendedSchemaFieldOption.properties.value.label
   */
  value: string;
}
