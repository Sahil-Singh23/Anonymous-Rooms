import express from "express";
import { v4 as uuidv4 } from "uuid";
import { getPutObjectURL, getObjectURL } from "../utils/s3.js";
import { client } from "../prisma.js";
import requireAuth from "../middlewares/requireAuth.js";

const router = express.Router();

// In-memory cache for presigned GET URLs: userId -> { url, expiresAt }
const profilePicUrlCache = new Map<number, { url: string; expiresAt: number }>();

const MAX_PROFILE_PIC_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const PRESIGNED_URL_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Get presigned GET URL for profile picture with caching
 * Returns cached URL if still valid, otherwise generates new one
 */
async function getProfilePicUrl(userId: number, s3Key: string): Promise<string> {
  const now = Date.now();
  const cached = profilePicUrlCache.get(userId);

  // Return cached URL if still valid (check if expires in more than 1 hour)
  if (cached && cached.expiresAt - now > 60 * 60 * 1000) {
    return cached.url;
  }

  // Generate new presigned URL
  const url = await getObjectURL(s3Key, PRESIGNED_URL_EXPIRY);
  const expiresAt = now + PRESIGNED_URL_EXPIRY * 1000;
  profilePicUrlCache.set(userId, { url, expiresAt });
  return url;
}

/**
 * Invalidate cached presigned URL for a user
 */
function invalidateProfilePicCache(userId: number): void {
  profilePicUrlCache.delete(userId);
}

/**
 * GET /profile/me
 * Get current authenticated user's profile
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; email: string; name: string } | undefined;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userProfile = await client.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicKey: true,
        totalRoomsJoined: true,
        lastRoomJoinedCode: true,
        createdAt: true,
      },
    });

    if (!userProfile) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate presigned GET URL if profile pic exists
    let profilePicUrl: string | null = null;
    if (userProfile.profilePicKey) {
      profilePicUrl = await getProfilePicUrl(user.id, userProfile.profilePicKey);
    }

    return res.status(200).json({
      ...userProfile,
      profilePicUrl,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * POST /profile/upload-pic
 * Upload profile picture to S3
 * Body: { filename, filetype, filesize }
 */
router.post("/upload-pic", requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; email: string; name: string } | undefined;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { filename, filetype, filesize } = req.body;

    // Validate input
    if (!filename || !filetype || !filesize) {
      return res.status(400).json({ error: "Missing required fields: filename, filetype, filesize" });
    }

    if (filesize > MAX_PROFILE_PIC_SIZE) {
      return res.status(400).json({
        error: `Profile picture exceeds maximum size (5MB). Your file is ${(filesize / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(filetype)) {
      return res.status(400).json({
        error: "Only JPEG, PNG, and WebP images are allowed",
      });
    }

    // Generate S3 key with userId and timestamp for uniqueness
    const timestamp = Date.now();
    const s3Key = `profilePic/${user.id}-${timestamp}-${filename}`;
    const expiresIn = 60 * 15; // 15 minutes

    // Get presigned PUT URL
    const putUrl = await getPutObjectURL(s3Key, filetype, expiresIn);

    return res.status(200).json({
      s3Key,
      presignedPutUrl: putUrl,
      expiresIn,
      message: "Use presignedPutUrl to upload your picture, then call /confirm-pic",
    });
  } catch (error) {
    console.error("Profile pic upload error:", error);
    return res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * POST /profile/confirm-pic
 * Confirm profile picture upload and save to database
 * Body: { s3Key }
 */
router.post("/confirm-pic", requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; email: string; name: string } | undefined;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { s3Key } = req.body;

    if (!s3Key) {
      return res.status(400).json({ error: "Missing s3Key" });
    }

    // Invalidate cache before updating
    invalidateProfilePicCache(user.id);

    // Update user's profile picture - store only the S3 key
    const updatedUser = await client.user.update({
      where: { id: user.id },
      data: {
        profilePicKey: s3Key,
        // Don't store profilePicUrl anymore - we'll generate it on demand
      },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicKey: true,
        totalRoomsJoined: true,
        createdAt: true,
      },
    });

    // Generate fresh presigned GET URL
    const profilePicUrl = await getProfilePicUrl(user.id, s3Key);

    return res.status(200).json({
      message: "Profile picture updated successfully",
      user: {
        ...updatedUser,
        profilePicUrl,
      },
    });
  } catch (error) {
    console.error("Confirm pic error:", error);
    return res.status(500).json({ error: "Failed to confirm profile picture" });
  }
});

export default router;
export { getProfilePicUrl, invalidateProfilePicCache };
