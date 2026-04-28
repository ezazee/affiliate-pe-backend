export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface BankDetails {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
}

export interface Withdrawal {
    _id?: any;
    id?: string;
    affiliatorId: string;
    amount: number;
    status: WithdrawalStatus;
    bankDetails: BankDetails;
    requestedAt: Date;
    processedAt?: Date;
    transferProof?: string;
    rejectionReason?: string; // Alasan penolakan
    activityLog?: {
        status: WithdrawalStatus;
        timestamp: Date;
        note?: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
