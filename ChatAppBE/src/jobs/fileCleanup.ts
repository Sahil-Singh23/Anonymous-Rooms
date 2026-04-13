import { client } from "../prisma.js";
import { deleteObjectFromS3 } from "../utils/s3.js";

/**
 * Delete expired files from S3 and database
 * Run this job every hour: in index.ts, call startFileCleanupJob()
 */
export async function cleanupExpiredFiles() {
  try {
    console.log("🧹 Starting file cleanup job...");

    // Find all expired files
    const expiredFiles = await client.file.findMany({
      where: {
        expiresAt: {
          lt: new Date() // Files where expiresAt < now
        }
      }
    });

    if (expiredFiles.length === 0) {
      console.log("✅ No expired files to clean up");
      return;
    }

    console.log(`Found ${expiredFiles.length} expired files to delete`);

    // Delete each file from S3
    for (const file of expiredFiles) {
      try {
        await deleteObjectFromS3(file.s3Key);
        console.log(`🗑️  Deleted from S3: ${file.s3Key}`);
      } catch (error) {
        console.error(`❌ Failed to delete from S3: ${file.s3Key}`, error);
      }
    }

    // Delete all expired files from database
    const result = await client.file.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    console.log(`✅ Cleanup complete: Deleted ${result.count} files`);
  } catch (error) {
    console.error("❌ File cleanup job failed:", error);
  }
}

/**
 * Start the cleanup job to run every hour
 * Call this in index.ts during server initialization
 */
export function startFileCleanupJob() {
  // Run cleanup immediately on startup
  cleanupExpiredFiles();

  // Then run every hour (3600000 ms)
  setInterval(() => {
    cleanupExpiredFiles();
  }, 60 * 60 * 1000);

  console.log("📅 File cleanup job scheduled to run every hour");
}
