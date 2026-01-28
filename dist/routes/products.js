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
const database_1 = __importDefault(require("../config/database"));
const mongodb_1 = require("mongodb");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * @swagger
 * /products:
 *   get:
 *     summary: Retrieve a list of active products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   price:
 *                     type: number
 *                   slug:
 *                     type: string
 */
// GET /products (List all products - modeled after affiliator/products/route.ts if that's the main list)
// or just generic list if needed. Will check the content of affiliator/products/route.ts first.
// If this file is intended to map src/app/api/products/[id], it primarily handles ID operations.
// I will create a base route for / (if needed) and /:id.
// PUT /products/:id
router.put('/:id', auth_1.authenticateUser, auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, slug, price, description, commissionType, commissionValue, isActive, imageUrl } = req.body;
        if (!name || !slug || !price || !commissionType || !commissionValue) {
            return res.status(400).json({ error: 'Missing required product fields' });
        }
        const client = yield database_1.default;
        const db = client.db();
        // Check for duplicate slug
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
        return res.json(Object.assign(Object.assign({}, updatedProduct), { id: updatedProduct === null || updatedProduct === void 0 ? void 0 : updatedProduct._id.toString() }));
    }
    catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
// DELETE /products/:id
router.delete('/:id', auth_1.authenticateUser, auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const client = yield database_1.default;
        const db = client.db();
        const result = yield db.collection('products').deleteOne({ _id: new mongodb_1.ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(200).json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
// GET /products/:id
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const client = yield database_1.default;
        const db = client.db();
        const product = yield db.collection('products').findOne({ _id: new mongodb_1.ObjectId(id) });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const { id: originalId } = product, rest = __rest(product, ["id"]);
        const formattedProduct = Object.assign(Object.assign({}, rest), { id: product._id.toString() });
        return res.json(formattedProduct);
    }
    catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
// GET /products (List all active products)
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        // Fetch only active products for affiliators (or all if admin? logic was specific to affiliator route but let's make it general or query param based)
        // For now mirroring the affiliator/products route which filters isActive: true
        const products = yield db.collection('products').find({ isActive: true }).toArray();
        const productsWithId = products.map((p) => {
            var _a;
            return (Object.assign(Object.assign({}, p), { id: (_a = p._id) === null || _a === void 0 ? void 0 : _a.toString() }));
        });
        return res.json(productsWithId);
    }
    catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
exports.default = router;
