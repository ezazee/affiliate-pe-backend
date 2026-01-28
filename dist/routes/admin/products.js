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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../../config/database"));
const mongodb_1 = require("mongodb");
const notification_service_1 = require("../../services/notification-service");
const auth_1 = require("../../middleware/auth");
const router = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management endpoints
 */
/**
 * @swagger
 * /admin/products:
 *   get:
 *     summary: List all products (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all products
 *   post:
 *     summary: Create a new product
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - price
 *               - commissionType
 *               - commissionValue
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               price:
 *                 type: number
 *               commissionType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               commissionValue:
 *                 type: number
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate slug
 */
// GET /api/admin/products - List all products
router.get('/', auth_1.authenticateUser, auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        const products = yield db.collection('products').find({}).toArray();
        // Map _id to id for consistency with frontend
        const formattedProducts = products.map(product => {
            const { id } = product, rest = __rest(product, ["id"]); // Remove the original 'id' field if it exists
            return Object.assign(Object.assign({}, rest), { id: product._id.toString() });
        });
        res.json(formattedProducts);
    }
    catch (error) {
        console.error('Error fetching admin products:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}));
// POST /api/admin/products - Create a new product
router.post('/', auth_1.authenticateUser, auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, slug, price, description, commissionType, commissionValue, isActive, imageUrl } = req.body;
        if (!name || !slug || !price || !commissionType || !commissionValue) {
            return res.status(400).json({ error: 'Missing required product fields' });
        }
        const client = yield database_1.default;
        const db = client.db();
        // Check for duplicate slug
        const existingProduct = yield db.collection('products').findOne({ slug });
        if (existingProduct) {
            return res.status(409).json({ error: 'Product with this slug already exists' });
        }
        const newProduct = {
            name,
            slug,
            price: Number(price),
            description: description || '',
            commissionType,
            commissionValue: Number(commissionValue),
            isActive: isActive !== null && isActive !== void 0 ? isActive : true,
            imageUrl: imageUrl || '/placeholder.svg',
        };
        const result = yield db.collection('products').insertOne(newProduct);
        const createdProduct = Object.assign(Object.assign({}, newProduct), { id: result.insertedId.toString() });
        // Send notification to all affiliators
        try {
            yield (0, notification_service_1.sendTemplateNotification)('new_product', {
                productName: name,
                slug: slug
            }, { role: 'affiliator' });
        }
        catch (notificationError) {
            console.error('❌ Failed to send new product notification:', notificationError);
        }
        res.status(201).json(createdProduct);
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}));
// PUT /api/admin/products/:id
/**
 * @swagger
 * /admin/products/{id}:
 *   put:
 *     summary: Update a product (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated
 */
router.put('/:id', auth_1.authenticateUser, auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, slug, price, description, commissionType, commissionValue, isActive, imageUrl } = req.body;
        if (!name || !slug || !price || !commissionType || !commissionValue) {
            return res.status(400).json({ error: 'Missing required product fields' });
        }
        const client = yield database_1.default;
        const db = client.db();
        // Verify duplicate slug if slug is changing
        const existingProductWithSlug = yield db.collection('products').findOne({
            slug,
            _id: { $ne: new mongodb_1.ObjectId(id) }
        });
        if (existingProductWithSlug) {
            return res.status(409).json({ error: 'Product with this slug already exists' });
        }
        const updatedProductData = {
            name,
            slug,
            price: Number(price),
            description: description || '',
            commissionType,
            commissionValue: Number(commissionValue),
            isActive: isActive !== null && isActive !== void 0 ? isActive : true,
            imageUrl: imageUrl || '/placeholder.svg',
        };
        const result = yield db.collection('products').updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: updatedProductData });
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const updatedProduct = yield db.collection('products').findOne({ _id: new mongodb_1.ObjectId(id) });
        const formattedProduct = updatedProduct ? Object.assign(Object.assign({}, updatedProduct), { id: updatedProduct._id.toString() }) : null;
        return res.json(formattedProduct);
    }
    catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
// DELETE /api/admin/products/:id
/**
 * @swagger
 * /admin/products/{id}:
 *   delete:
 *     summary: Delete a product (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete('/:id', auth_1.authenticateUser, auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const client = yield database_1.default;
        const db = client.db();
        const result = yield db.collection('products').deleteOne({ _id: new mongodb_1.ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
exports.default = router;
