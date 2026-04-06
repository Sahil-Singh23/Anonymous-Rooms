import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
const bucketName = process.env.AWS_S3_BUCKET_NAME || "";
const region = process.env.AWS_REGION || "ap-south-1";

if (!accessKeyId || !secretAccessKey || !bucketName) {
  console.warn("⚠️  AWS credentials or bucket name missing! File uploads will fail.");
}

const s3client = new S3Client({
  region: region,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

/**
 * Get presigned GET URL (for downloading/viewing files)
 * URL expires in 1 hour
 */
async function getObjectURL(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  const url = await getSignedUrl(s3client, command, { expiresIn });
  return url;
}

/**
 * Get presigned PUT URL (for client to upload files directly)
 * URL expires in 15 minutes by default (enough to upload)
 */
async function getPutObjectURL(key: string, fileType: string, expiresIn: number = 900): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: fileType,
  });
  const url = await getSignedUrl(s3client, command, { expiresIn });
  return url;
}

/**
 * Delete file from S3
 */
async function deleteObjectFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  await s3client.send(command);
}

export { getObjectURL, getPutObjectURL, deleteObjectFromS3 };