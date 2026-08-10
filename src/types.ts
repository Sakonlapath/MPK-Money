/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'APPROVER' | 'USER';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  projectAuth?: string[]; // IDs of projects they can approve (for APPROVER)
  photoURL?: string;
  signatureURL?: string;
  phoneNumber?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  totalBudget: number;
  allocatedBudget: number;
  managerId: string;
}

export interface SubActivity {
  id: string;
  projectId: string;
  name: string;
  initialBudget: number;
  spentBudget: number;
  responsiblePersonIds?: string[];
  responsiblePersonNames?: string[];
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLEARED';

export interface RequestHistoryEntry {
  action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'CLEARED' | 'EDITED';
  timestamp: number;
  userId: string;
  userName: string;
  remark?: string;
}

export interface BudgetRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  projectId: string;
  projectName: string;
  activityId: string;
  activityName: string;
  amount: number;
  monthlyAmounts?: Record<string, number>;
  actualSpent?: number;
  actualSpentMonthly?: Record<string, number>;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  responsiblePerson: string;
  responsiblePersonId?: string;
  reason: string;
  attachmentUrl?: string;
  status: RequestStatus;
  createdAt: number;
  updatedAt: number;
  remark?: string;
  approverId?: string;
  approverName?: string;
  history?: RequestHistoryEntry[];
}

export interface SystemAlert {
  id: string;
  type: 'DUPLICATE' | 'STATUS_UPDATE' | 'INFO';
  message: string;
  timestamp: number;
  relatedRequestId?: string;
  userId: string;
  announcerName?: string;
  announcerPhoto?: string;
}
