import { Order } from './order';

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled' | 'withdrawn' | 'reserved' | 'processed';

export interface Commission {
    _id?: any;
    id: string;
    affiliatorId: string;
    affiliateName: string;
    orderId: string;
    productName: string;
    amount: number;
    status: CommissionStatus;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
    withdrawalId?: string;

    // Simple balance tracking
    usedAmount?: number; // Jumlah yang sudah di-withdraw
    isPartial?: boolean; // Untuk filter partial commissions
    parentCommissionId?: string; // ID komisi induk jika ini adalah komisi parsial
    order?: Order;
}
