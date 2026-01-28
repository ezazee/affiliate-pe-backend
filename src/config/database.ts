import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config(); // Load from .env in current directory by default

const uri = process.env.MONGODB_URI;
const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 20000, // Increased to 20s for Vercel
    socketTimeoutMS: 45000,
    connectTimeoutMS: 20000, // Increased to 20s
    retryWrites: true,
    retryReads: true,

};

if (!uri) {
    // We can't throw at top level if we want testing to work without env sometimes, but for now strict.
    console.warn('Warning: MONGODB_URI not found in environment variables. DB connection will fail.');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
    clientPromise = Promise.reject(new Error('MONGODB_URI not defined'));
} else {
    // Debug Logging for Vercel
    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
    console.log(`[MongoDB] Attempting connection to: ${maskedUri}`);

    // In standard Node.js (non-serverless/non-Next.js HMR), we can just create the client.
    // However, if we want to share the connection logic, we can keep the singleton pattern.
    if (process.env.NODE_ENV === 'development') {
        const globalWithMongo = global as typeof globalThis & {
            _mongoClientPromise?: Promise<MongoClient>;
        };

        if (!globalWithMongo._mongoClientPromise) {
            client = new MongoClient(uri, options);
            globalWithMongo._mongoClientPromise = client.connect();
        }
        clientPromise = globalWithMongo._mongoClientPromise;
    } else {
        client = new MongoClient(uri, options);
        clientPromise = client.connect();
    }
}

export default clientPromise;
