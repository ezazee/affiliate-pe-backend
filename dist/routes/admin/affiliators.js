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
const router = express_1.default.Router();
/**
 * @swagger
 * /admin/affiliators:
 *   get:
 *     summary: Get all affiliators
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of affiliators
 */
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        const affiliators = yield db.collection('users').find({ role: 'affiliator' }).toArray();
        const formattedAffiliators = affiliators.map(affiliator => {
            const { id } = affiliator, rest = __rest(affiliator, ["id"]);
            return Object.assign(Object.assign({}, rest), { id: affiliator._id.toString() });
        });
        return res.json(formattedAffiliators);
    }
    catch (error) {
        console.error('Error fetching affiliators:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
/**
 * @swagger
 * /admin/affiliators/{id}:
 *   delete:
 *     summary: Delete an affiliator (Admin)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Affiliator deleted
 */
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const client = yield database_1.default;
        const db = client.db();
        const result = yield db.collection('users').deleteOne({ _id: new mongodb_1.ObjectId(id), role: 'affiliator' });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Affiliator not found' });
        }
        return res.json({ message: 'Affiliator deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting affiliator:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
// Update affiliator status (approve/reject) often exists but maybe in separate file. 
// Adding generic PUT for user details if needed, but usually approval is specific.
// I will check if there is an approval route elsewhere. 
// There is /users/:id/status usually, but let's add generic delete support here.
exports.default = router;
