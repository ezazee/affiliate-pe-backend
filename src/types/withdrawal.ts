import { ObjectId } from 'mongodb';

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface BankDetails {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
}

export interface Withdrawal {
    _id?: ObjectId | string;
    id?: string;
    affiliatorId: string;
    amount: number;
    status: WithdrawalStatus;
    bankDetails: BankDetails;
    requestedAt: Date;
    processedAt?: Date;
    rejectionReason?: string; // Alasan penolakan
}
