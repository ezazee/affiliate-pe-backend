import { ObjectId } from 'mongodb';
import { BankDetails } from './withdrawal';

export type UserRole = 'admin' | 'affiliator';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface PushSubscription {
    endpoint: string;
    keys: {
        auth: string;
        p256dh: string;
    };
}

export interface User {
    _id: ObjectId;
    id: string;
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    status: UserStatus;
    phone?: string;
    referralCode: string;
    registrationNumber?: string;
    bankDetails?: BankDetails;
    createdAt: Date;
    pushSubscription?: PushSubscription;
    notificationsEnabled?: boolean;
    updatedAt?: Date;
}
