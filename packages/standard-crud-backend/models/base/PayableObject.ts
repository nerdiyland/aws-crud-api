import { StandaloneObject } from './StandaloneObject';

export interface PayableObject extends StandaloneObject {
  LastTransactionId?: string;
  LastTransactionDate?: Date;
  TransactionExpiration?: Date;

  TransactionHistory?: TransactionHistory[];
}

export interface TransactionHistory {
  TransactionId: string;
  TransactionDate: Date;
  TransactionExpiration: Date;
}
