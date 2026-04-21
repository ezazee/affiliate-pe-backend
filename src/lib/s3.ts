import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const minioEndpoint = process.env.MINIO_ENDPOINT || "";
const accessKeyId = process.env.MINIO_ACCESS_KEY || "";
const secretAccessKey = process.env.MINIO_SECRET_KEY || "";
const region = process.env.MINIO_REGION || "us-east-1";

export const s3Client = new S3Client({
    endpoint: minioEndpoint,
    region: region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
    forcePathStyle: true, // Required for Minio
});

export const bucketName = process.env.MINIO_BUCKET || "peskin-affiliate";
export const publicUrl = process.env.MINIO_PUBLIC_URL || minioEndpoint;
