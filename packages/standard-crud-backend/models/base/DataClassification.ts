
export enum DataClassificationStandard {
  PUBLIC = 'public',
  INTERNAL_ONLY = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  // Add other classification policies here
}

export enum DataClassificationRegulation {
  GDPR = 'gdpr',
  SOC_2 = 'soc2',
  HIPAA = 'hipaa',
  PCI = 'pci',
  // Other data classification regulations
}

/**
 * Defines the data classification policies and standards that customer data must comply with.
 */
export interface DataClassification {

  /**
   * Defines the standard to use to classify data
   * @label Classification Standard
   * @summary This standard helps you categorize your data according to their classification.
   * @fieldType select
   */
  ClassificationStandard?: DataClassificationStandard;

  /**
   * Defines the standard to use to classify data
   * @label Classification Standard
   * @summary This standard helps you categorize your data according to their classification.
   * @fieldType select
   */
  DataProtectionRegulations?: DataClassificationRegulation[];

  /**
   * Whether to audit every read operation on this record
   * @label Audit reads
   * @summary Comply with your internal policies by auditing accesses to this information.
   */
  AuditReads?: boolean;

  /**
   * Whether to encrypt information again for additional security policies
   * @label Double encryption
   * @summary Add more security on your stored data by encrypting this information again.
   */
  DoubleEncryption?: boolean;

  /**
   * ID of the encryption key to use to encrypt this data
   * @label Encryption key
   * @summary Have full control over your data access by encrypting information with your own key.
   */
  EncryptionKeyId?: string;
}