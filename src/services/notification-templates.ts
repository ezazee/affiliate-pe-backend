export interface NotificationTemplate {
    id: string;
    name: string;
    description: string;
    defaultTitle: string;
    defaultBody: string;
    defaultUrl: string;
    roles: ('admin' | 'affiliator')[];
    category: 'order' | 'affiliate' | 'withdrawal' | 'commission';
}

export const notificationTemplates: NotificationTemplate[] = [
    // Admin Notifications
    {
        id: 'new_affiliate',
        name: 'Pendaftaran Affiliator Baru',
        description: 'Notifikasi untuk admin ketika ada affiliator baru mendaftar',
        defaultTitle: '👋 Affiliator Baru!',
        defaultBody: '{name} ({email}) baru saja mendaftar sebagai affiliator',
        defaultUrl: '/admin/affiliators',
        roles: ['admin'],
        category: 'affiliate'
    },
    {
        id: 'new_order_admin',
        name: 'Pesanan Baru (Admin)',
        description: 'Notifikasi untuk admin ketika ada pesanan baru',
        defaultTitle: '🛒 Pesanan Baru!',
        defaultBody: 'Pesanan #{orderId} sebesar Rp{amount} dari {customerName}',
        defaultUrl: '/admin/orders',
        roles: ['admin'],
        category: 'order'
    },
    {
        id: 'withdrawal_request',
        name: 'Permohonan Penarikan Dana',
        description: 'Notifikasi untuk admin ketika ada permohonan penarikan dana',
        defaultTitle: '💸 Permohonan Penarikan',
        defaultBody: '{name} mengajukan penarikan dana sebesar Rp{amount}',
        defaultUrl: '/admin/withdrawals',
        roles: ['admin'],
        category: 'withdrawal'
    },
    {
        id: 'new_product',
        name: 'Produk Baru',
        description: 'Notifikasi untuk affiliator ketika ada produk baru',
        defaultTitle: '🔥 Produk Baru!',
        defaultBody: 'Produk baru "{productName}" telah tersedia. Promosikan sekarang!',
        defaultUrl: '/products/{slug}',
        roles: ['affiliator'],
        category: 'affiliate'
    },

    // Affiliator Notifications
    {
        id: 'new_order_affiliate',
        name: 'Pesanan Baru (Affiliator)',
        description: 'Notifikasi untuk affiliator ketika ada pesanan baru',
        defaultTitle: '🎉 Pesanan Baru!',
        defaultBody: 'Anda mendapatkan pesanan #{orderId} sebesar Rp{amount}',
        defaultUrl: '/affiliator/orders',
        roles: ['affiliator'],
        category: 'order'
    },
    {
        id: 'order_paid',
        name: 'Pesanan Dibayar',
        description: 'Notifikasi ketika pesanan telah dibayar',
        defaultTitle: '💸 Pesanan Dibayar',
        defaultBody: 'Pesanan #{orderId} telah dibayar oleh pembeli',
        defaultUrl: '/affiliator/orders/{orderId}',
        roles: ['affiliator'],
        category: 'order'
    },
    {
        id: 'order_shipped',
        name: 'Pesanan Dikirim',
        description: 'Notifikasi ketika pesanan telah dikirim',
        defaultTitle: '📦 Pesanan Dikirim',
        defaultBody: 'Pesanan #{orderId} telah dikirim ke alamat Anda',
        defaultUrl: '/affiliator/orders/{orderId}',
        roles: ['affiliator'],
        category: 'order'
    },
    {
        id: 'order_completed',
        name: 'Pesanan Telah Selesai',
        description: 'Notifikasi ketika pesanan telah selesai',
        defaultTitle: '✅ Pesanan Selesai',
        defaultBody: 'Pesanan #{orderId} telah selesai, komisi telah ditambahkan',
        defaultUrl: '/affiliator/orders/{orderId}',
        roles: ['affiliator'],
        category: 'order'
    },
    {
        id: 'commission_earned',
        name: 'Pemasukan Komisi',
        description: 'Notifikasi ketika komisi diperoleh',
        defaultTitle: '💰 Komisi Masuk!',
        defaultBody: 'Anda mendapatkan komisi sebesar Rp{amount} dari pesanan #{orderId}',
        defaultUrl: '/affiliator/commissions',
        roles: ['affiliator'],
        category: 'commission'
    },
    {
        id: 'balance_updated',
        name: 'Update Saldo Dapat Ditarik',
        description: 'Notifikasi ketika saldo yang dapat ditarik bertambah',
        defaultTitle: '💵 Saldo Terupdate',
        defaultBody: 'Saldo yang dapat ditarik: Rp{balance}',
        defaultUrl: '/affiliator/commissions',
        roles: ['affiliator'],
        category: 'commission'
    },
    {
        id: 'withdrawal_approved',
        name: 'Penarikan Di Approve',
        description: 'Notifikasi ketika penarikan disetujui',
        defaultTitle: '✅ Penarikan Disetujui',
        defaultBody: 'Penarikan dana Rp{amount} telah disetujui dan diproses',
        defaultUrl: '/affiliator/commissions',
        roles: ['affiliator'],
        category: 'withdrawal'
    },
    {
        id: 'withdrawal_rejected',
        name: 'Penarikan Ditolak',
        description: 'Notifikasi ketika penarikan ditolak',
        defaultTitle: '❌ Penarikan Ditolak',
        defaultBody: 'Penarikan dana Rp{amount} ditolak. Alasan: {reason}',
        defaultUrl: '/affiliator/commissions',
        roles: ['affiliator'],
        category: 'withdrawal'
    }
];

export type NotificationTemplateId = typeof notificationTemplates[number]['id'];

export interface NotificationVariables {
    [key: string]: string | number | undefined;
    orderId?: string;
    amount?: string | number;
    customerName?: string;
    name?: string;
    email?: string;
    balance?: string | number;
    reason?: string;
    productName?: string;
    slug?: string;
}

export interface NotificationConfig {
    templateId: NotificationTemplateId;
    title?: string;
    body?: string;
    url?: string;
    variables?: NotificationVariables;
    targetUserId?: string;
    targetRole?: 'admin' | 'affiliator';
}

export function getTemplateById(id: NotificationTemplateId): NotificationTemplate | undefined {
    return notificationTemplates.find(template => template.id === id);
}

export function formatNotificationText(text: string, variables: NotificationVariables = {}): string {
    let formatted = text;

    Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        formatted = formatted.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return formatted;
}

export function buildNotification(config: NotificationConfig): {
    title: string;
    body: string;
    url: string;
} {
    const template = getTemplateById(config.templateId);
    if (!template) {
        throw new Error(`Template not found: ${config.templateId}`);
    }

    const variables = config.variables || {};

    return {
        title: config.title || formatNotificationText(template.defaultTitle, variables),
        body: config.body || formatNotificationText(template.defaultBody, variables),
        url: config.url || formatNotificationText(template.defaultUrl, variables)
    };
}
