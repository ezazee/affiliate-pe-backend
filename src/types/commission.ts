import { ObjectId } from 'mongodb';
import { Order } from './order';

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled' | 'withdrawn' | 'reserved' | 'processed';

export interface Commission {
    _id: ObjectId | string;
    id: string;
    affiliatorId: string;
    affiliateName: string;
    orderId: string;
    productName: string;
    amount: number;
    status: CommissionStatus;
    date: Date;
    createdAt: Date;
    withdrawalId?: string;

    // Simple balance tracking
    usedAmount?: number; // Jumlah yang sudah di-withdraw
    isPartial?: boolean; // Untuk filter partial commissions
    order?: Order;
}
