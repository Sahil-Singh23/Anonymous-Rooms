import express from "express"
import { v4 as uuidv4 } from "uuid";
import requireAuth from "../middlewares/requireAuth";
import { getObjectURL, getPutObjectURL, deleteObjectFromS3 } from "../utils/s3";
import { client } from "../prisma";

const router = express.Router();

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "25") * 1024 * 1024;  // Default 25MB

const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Text
  'text/plain',
  // Video
  'video/mp4',
  'video/webm',
];

function validateFileType(filetype: string): boolean {
  return ALLOWED_FILE_TYPES.includes(filetype);
}

router.post("/upload",async (req,res)=>{
    const {filename,filetype,filesize,roomCode} = req.body; 

    if(!filename || !filetype || !filesize || !roomCode)  return res.status(400).json({message:"Invalid payload"});

    if(filesize > MAX_FILE_SIZE) return res.status(400).json({error:"File size exceeds maximum limit"});
    if(!validateFileType(filetype)) return res.status(400).json({error:"File type not allowed"});

    const s3key = `uploads/${uuidv4()}-${filename}`;
    const expiresIn = 60 * 15;

    try {
        const putUrl = await getPutObjectURL(s3key, filetype, expiresIn);
        
        return res.status(200).json({
            s3Key: s3key,
            presignedPutUrl: putUrl,
            expiresIn: expiresIn
        });
    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({error: "Failed to generate upload URL"});
    }
})

router.post("/confirm",async(req,res)=>{
    try {
        const {key,filename,filetype,filesize} = req.body;
        if(!key || !filename || !filetype || !filesize) return res.status(400).json({error:"Invalid payload"});

        const userId = (req as any).user?.id || null;
        const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const file = await client.file.create({
            data: {
                filename,
                fileType: filetype,
                fileSize: filesize,
                s3Key: key,
                s3Url: s3Url,
                userId: userId,
                expiresAt: expiresAt
            }
        });

        return res.status(201).json({
            fileId: file.id,
            s3Key: file.s3Key,
            s3Url: file.s3Url
        });
    } catch (error) {
        console.error("Confirm error:", error);
        return res.status(500).json({error: "Failed to confirm file upload"});
    }
})

router.get("/get/:key",async(req,res)=>{
    try {
        const key = req.params.key;

        const file = await client.file.findUnique({
            where: { s3Key: key }
        });

        if(!file) return res.status(404).json({error:"File not found"});
        if(file.expiresAt <= new Date()) return res.status(410).json({error:"File has expired"});

        const url = await getObjectURL(file.s3Key);

        return res.status(200).json({
            id: file.id,
            filename: file.filename,
            fileType: file.fileType,
            fileSize: file.fileSize,
            presignedGetUrl: url,
            expiresIn: 3600,
            createdAt: file.createdAt
        });
    } catch (error) {
        console.error("Get file error:", error);
        return res.status(500).json({error: "Failed to get file"});
    }
});

router.delete("/delete/:fileId", async (req, res) => {
    try {
        const fileId = parseInt(req.params.fileId);
        const userId = (req as any).user?.id || null;

        const file = await client.file.findUnique({
            where: { id: fileId }
        });

        if (!file) return res.status(404).json({error: "File not found"});

        // Only allow deletion if user owns the file or is admin
        if (file.userId && userId !== file.userId) {
            return res.status(403).json({error: "You don't have permission to delete this file"});
        }

        // Delete from S3
        await deleteObjectFromS3(file.s3Key);

        // Delete from DB
        await client.file.delete({
            where: { id: fileId }
        });

        return res.status(200).json({
            message: "File deleted successfully",
            fileId: fileId
        });
    } catch (error) {
        console.error("Delete file error:", error);
        return res.status(500).json({error: "Failed to delete file"});
    }
});

export default router;