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
    _id?: any;
    id: string;
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    status: UserStatus;
    phone?: string;
    referralCode?: string;
    registrationNumber?: string;
    bankDetails?: BankDetails;
    pushSubscription?: PushSubscription | null;
    notificationsEnabled?: boolean;
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;
    storeName?: string;
    storeSlug?: string;
    storeBio?: string;
    storeThemeColor?: string;
    storeSocialLinks?: any;
    createdAt: Date;
    updatedAt: Date;
}
