import User from './User';
import Product from './Product';
import Order from './Order';
import Commission from './Commission';
import Withdrawal from './Withdrawal';
import AffiliateLink from './AffiliateLink';
import Notification from './Notification';
import LinkClick from './LinkClick';
import Setting from './Setting';
import BundleItem from './BundleItem';
import StockLog from './StockLog';

// User Associations
User.hasMany(AffiliateLink, { foreignKey: 'affiliatorId', as: 'affiliateLinks' });
User.hasMany(Commission, { foreignKey: 'affiliatorId', as: 'commissions' });
User.hasMany(Order, { foreignKey: 'affiliatorId', as: 'orders' });
User.hasMany(Withdrawal, { foreignKey: 'affiliatorId', as: 'withdrawals' });

// AffiliateLink Associations
AffiliateLink.belongsTo(User, { foreignKey: 'affiliatorId', as: 'affiliator' });
AffiliateLink.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
AffiliateLink.hasMany(LinkClick, { foreignKey: 'linkId', as: 'clickData' });

// Product Associations
Product.hasMany(AffiliateLink, { foreignKey: 'productId', as: 'links' });
Product.hasMany(StockLog, { foreignKey: 'productId', as: 'stockLogs' });

// Commission Associations
Commission.belongsTo(User, { foreignKey: 'affiliatorId', as: 'affiliator' });
Commission.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Withdrawal Associations
Withdrawal.belongsTo(User, { foreignKey: 'affiliatorId', as: 'affiliator' });

// Order Associations
Order.belongsTo(User, { foreignKey: 'affiliatorId', as: 'affiliator' });
Order.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Order.hasMany(Commission, { foreignKey: 'orderId', as: 'commissions' });

// LinkClick Associations
LinkClick.belongsTo(AffiliateLink, { foreignKey: 'linkId', as: 'link' });

// BundleItem Associations
Product.hasMany(BundleItem, { foreignKey: 'bundleProductId', as: 'bundleItems' });
BundleItem.belongsTo(Product, { foreignKey: 'bundleProductId', as: 'bundleProduct' });
BundleItem.belongsTo(Product, { foreignKey: 'componentProductId', as: 'componentProduct' });

// StockLog Associations
StockLog.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

export {
    User,
    Product,
    Order,
    Commission,
    Withdrawal,
    AffiliateLink,
    Notification,
    LinkClick,
    Setting,
    BundleItem,
    StockLog
};
