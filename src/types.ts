export interface UserSettings {
  uid: string;
  email: string;
  theme: 'light' | 'dark';
  dailyReminderTime: string; // e.g. "09:00"
  createdAt: any; // Firestore Timestamp or ISO string
  updatedAt: any;
  transactionsCount?: number;
  autoMergeStatements?: boolean;
  statementKeepCount?: number;
  biometricEnabled?: boolean;
}

export interface Customer {
 id: string;
 userId: string;
 name: string;
 phone: string;
 outstandingDue: number; // calculated balance sum
 createdAt: any;
 updatedAt: any;
 isDeleted?: boolean;
 deletedAt?: any;
}

export interface Transaction {
 id: string;
 userId: string;
 customerId: string;
 customerName: string;
 type: 'due' | 'payment';
 amount: number;
 description: string;
 date: any;
 createdAt: any;
 isEdited?: boolean;
 editedAt?: any;
}

export interface Reminder {
 id: string;
 userId: string;
 customerId: string;
 customerName: string;
 notes: string;
 dueDate: any; // Target pay date
 active: boolean;
 createdAt: any;
 type?: 'customer' | 'emi';
 goalId?: string;
 emiDayOfMonth?: number;
 installmentAmount?: number;
}

export interface FirestoreErrorInfo {
 error: string;
 operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
 path: string | null;
 authInfo: {
 userId?: string | null;
 email?: string | null;
 emailVerified?: boolean | null;
 isAnonymous?: boolean | null;
 };
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string; // ISO string
  note?: string;
}

export interface SavingGoal {
  id: string;
  userId: string;
  customerId?: string;
  customerName?: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'flexible';
  installmentAmount?: number;
  notes?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: any;
  updatedAt: any;
  type: 'savings' | 'deposit';
  principalAmount?: number;
  interestRate?: number;
  interestAmount?: number;
  tenure?: number;
  contributions: GoalContribution[];
}

export interface ImportProgress {
  stage: 'parsing' | 'saving' | 'summaries' | 'done';
  percent: number;
  currentBatch?: number;
  totalBatches?: number;
  processedCount?: number;
  totalCount?: number;
  message: string;
}

