"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load from .env in current directory by default
const uri = process.env.MONGODB_URI;
const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
    family: 4, // Force IPv4
};
if (!uri) {
    // We can't throw at top level if we want testing to work without env sometimes, but for now strict.
    console.warn('Warning: MONGODB_URI not found in environment variables. DB connection will fail.');
}
let client;
let clientPromise;
if (!uri) {
    clientPromise = Promise.reject(new Error('MONGODB_URI not defined'));
}
else {
    // In standard Node.js (non-serverless/non-Next.js HMR), we can just create the client.
    // However, if we want to share the connection logic, we can keep the singleton pattern.
    if (process.env.NODE_ENV === 'development') {
        const globalWithMongo = global;
        if (!globalWithMongo._mongoClientPromise) {
            client = new mongodb_1.MongoClient(uri, options);
            globalWithMongo._mongoClientPromise = client.connect();
        }
        clientPromise = globalWithMongo._mongoClientPromise;
    }
    else {
        client = new mongodb_1.MongoClient(uri, options);
        clientPromise = client.connect();
    }
}
exports.default = clientPromise;
