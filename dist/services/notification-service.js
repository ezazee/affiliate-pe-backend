"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.affiliatorNotifications = exports.adminNotifications = void 0;
exports.sendTemplateNotification = sendTemplateNotification;
exports.sendNotification = sendPushNotification;
const web_push_1 = __importDefault(require("web-push"));
const database_1 = __importDefault(require("../config/database"));
const notification_templates_1 = require("./notification-templates");
const mongodb_1 = require("mongodb");
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
// Configure web-push
if (vapidPrivateKey && vapidPublicKey) {
    web_push_1.default.setVapidDetails('mailto:admin@peskinpro.com', vapidPublicKey, vapidPrivateKey);
}
// Save notification to database for Web UI
function saveInAppNotification(data, target) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = yield database_1.default;
            const db = client.db();
            const notificationsCollection = db.collection('notifications');
            const notificationDoc = {
                title: data.title,
                message: data.body, // Mapping body to message for WebNotification type
                type: data.type || 'info',
                url: data.url,
                timestamp: new Date(),
                read: false,
                target, // Store target info to filter queries
                createdAt: new Date()
            };
            const usersCollection = db.collection('users');
            let query = {};
            if (target.role === 'admin') {
                query.role = 'admin';
            }
            else if (target.role === 'affiliator') {
                query.role = { $in: ['affiliator', 'affiliate'] };
            }
            else if (target.userEmail) {
                query.email = target.userEmail;
            }
            else if (target.userId) {
                query._id = new mongodb_1.ObjectId(target.userId);
            }
            const users = yield usersCollection.find(query).toArray();
            if (users.length > 0) {
                const notifications = users.map(user => (Object.assign(Object.assign({}, notificationDoc), { userEmail: user.email, userId: user._id.toString(), target: undefined // Remove generic target
                 })));
                yield notificationsCollection.insertMany(notifications);
            }
        }
        catch (error) {
            // Silent error
            console.error('Error saving in-app notification:', error);
        }
    });
}
// Internal function to send the actual push notification
function sendPushNotification(data, target) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = yield database_1.default;
            const db = client.db();
            const usersCollection = db.collection('users');
            // Build query based on target
            let query = {
                pushSubscription: { $exists: true, $ne: null },
                $or: [
                    { notificationsEnabled: true },
                    { notificationsEnabled: { $exists: false }, },
                    { notificationsEnabled: null }
                ]
            };
            if (target) {
                if (target.role === 'admin') {
                    query.role = 'admin';
                }
                else if (target.role === 'affiliator') {
                    query.role = { $in: ['affiliator', 'affiliate'] };
                }
                else if (target.userEmail) {
                    query.email = target.userEmail;
                }
                else if (target.userId) {
                    query._id = new mongodb_1.ObjectId(target.userId);
                }
            }
            const users = yield usersCollection.find(query).toArray();
            if (users.length === 0) {
                return {
                    success: true,
                    sent: 0,
                    failed: 0,
                    message: 'No users with push subscriptions found'
                };
            }
            const payload = JSON.stringify({
                title: data.title,
                body: data.body,
                url: data.url,
                icon: data.icon || '/favicon/android-chrome-192x192.png',
                badge: data.badge || '/favicon/favicon-32x32.png',
            });
            const sendPromises = users.map((user) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!user.pushSubscription)
                        return { success: false, userId: user.email, error: 'No subscription' };
                    yield web_push_1.default.sendNotification(user.pushSubscription, payload);
                    return { success: true, userId: user.email };
                }
                catch (error) {
                    console.error(`❌ Failed to send to ${user.email}:`, error.message);
                    // Remove invalid subscription
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        yield usersCollection.updateOne({ email: user.email }, {
                            $unset: { pushSubscription: '' },
                            $set: { notificationsEnabled: false },
                        });
                    }
                    return { success: false, userId: user.email, error: error.message };
                }
            }));
            const results = yield Promise.allSettled(sendPromises);
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;
            return {
                success: successful > 0,
                sent: successful,
                failed,
                message: `Notification sent to ${successful} users`
            };
        }
        catch (error) {
            return {
                success: false,
                sent: 0,
                failed: 0,
                message: `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    });
}
// Function to get template with custom overrides
function getResolvedTemplate(templateId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const defaultTemplate = notification_templates_1.notificationTemplates.find(t => t.id === templateId);
        if (!defaultTemplate)
            return null;
        try {
            const client = yield database_1.default;
            const db = client.db();
            const settings = yield db.collection('settings').findOne({ key: 'notificationTemplates' });
            const custom = (_a = settings === null || settings === void 0 ? void 0 : settings.templates) === null || _a === void 0 ? void 0 : _a.find((t) => t.templateId === templateId);
            // If explicitly disabled
            if (custom && custom.enabled === false) {
                return null;
            }
            return {
                title: (custom === null || custom === void 0 ? void 0 : custom.title) || defaultTemplate.defaultTitle,
                body: (custom === null || custom === void 0 ? void 0 : custom.body) || defaultTemplate.defaultBody,
                url: (custom === null || custom === void 0 ? void 0 : custom.url) || defaultTemplate.defaultUrl,
                roles: defaultTemplate.roles,
                category: defaultTemplate.category
            };
        }
        catch (error) {
            console.error('Error fetching template settings:', error);
            // Fallback to default
            return {
                title: defaultTemplate.defaultTitle,
                body: defaultTemplate.defaultBody,
                url: defaultTemplate.defaultUrl,
                roles: defaultTemplate.roles,
                category: defaultTemplate.category
            };
        }
    });
}
// Main function to trigger notification by template
function sendTemplateNotification(templateId, variables, targetOverride) {
    return __awaiter(this, void 0, void 0, function* () {
        const template = yield getResolvedTemplate(templateId);
        if (!template) {
            return;
        }
        const title = (0, notification_templates_1.formatNotificationText)(template.title, variables);
        const body = (0, notification_templates_1.formatNotificationText)(template.body, variables);
        const url = (0, notification_templates_1.formatNotificationText)(template.url, variables);
        // Determine target
        let target = {};
        if (targetOverride) {
            target = targetOverride;
        }
        else {
            if (template.roles.includes('admin')) {
                target.role = 'admin';
            }
            else if (template.roles.includes('affiliator')) {
                target.role = 'affiliator';
            }
        }
        // Map category to notification type
        let type = 'info';
        if (template.category === 'commission' || template.category === 'order')
            type = 'success';
        if (template.category === 'withdrawal')
            type = 'warning';
        if (templateId === 'withdrawal_rejected')
            type = 'error';
        // 1. Save In-App Notification
        yield saveInAppNotification({ title, body, url, type }, target);
        // 2. Send Push Notification
        return sendPushNotification({ title, body, url, type }, target);
    });
}
// Helper methods
exports.adminNotifications = {
    newAffiliator: (name, email) => sendTemplateNotification('new_affiliate', { name, email }, { role: 'admin' }),
    newOrder: (orderId, customerName, amount) => sendTemplateNotification('new_order_admin', { orderId, customerName, amount }, { role: 'admin' }),
    withdrawalRequest: (name, amount) => sendTemplateNotification('withdrawal_request', { name, amount }, { role: 'admin' }),
};
exports.affiliatorNotifications = {
    newOrder: (orderId, amount, targetUserEmail) => sendTemplateNotification('new_order_affiliate', { orderId, amount }, { userEmail: targetUserEmail }),
    orderShipped: (orderId, customerName, targetUserEmail) => sendTemplateNotification('order_shipped', { orderId, customerName }, { userEmail: targetUserEmail }),
    orderCompleted: (orderId, customerName, targetUserEmail) => sendTemplateNotification('order_completed', { orderId, customerName }, { userEmail: targetUserEmail }),
    orderPaid: (orderId, targetUserEmail) => sendTemplateNotification('order_paid', { orderId }, { userEmail: targetUserEmail }),
    commissionEarned: (amount, orderId, targetUserEmail) => sendTemplateNotification('commission_earned', { amount, orderId }, { userEmail: targetUserEmail }),
    balanceUpdated: (balance, targetUserEmail) => sendTemplateNotification('balance_updated', { balance }, { userEmail: targetUserEmail }),
    withdrawalApproved: (amount, processedAt, targetUserEmail) => sendTemplateNotification('withdrawal_approved', { amount }, { userEmail: targetUserEmail }),
    withdrawalRejected: (amount, reason, targetUserEmail) => sendTemplateNotification('withdrawal_rejected', { amount, reason }, { userEmail: targetUserEmail }),
};
