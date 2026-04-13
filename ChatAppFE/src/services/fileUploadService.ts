import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface UploadUrlResponse {
  s3Key: string;
  presignedPutUrl: string;
  expiresIn: number;
}

export interface ConfirmUploadResponse {
  fileId: number;
  s3Key: string;
  s3Url: string;
}

export interface FileMetadataResponse {
  id: number;
  filename: string;
  fileType: string;
  fileSize: number;
  presignedGetUrl: string;
  expiresIn: number;
  createdAt: string;
}

/**
 * Step 1: Request presigned PUT URL from backend
 * Then upload file directly to S3
 */
export async function uploadFileToS3(
  file: File,
  roomCode: string
): Promise<string> {
  try {
    // Validate file on client side
    if (!file) {
      throw new Error('No file selected');
    }

    const ALLOWED_TYPES = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'video/mp4',
      'video/webm',
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`File type not allowed: ${file.type}`);
    }

    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE) {
      throw new Error(`File size exceeds 25MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    // Step 1: Get presigned PUT URL from backend
    const uploadUrlRes = await axios.post<UploadUrlResponse>(
      `${API_BASE_URL}/files/upload`,
      {
        filename: file.name,
        filetype: file.type,
        filesize: file.size,
        roomCode: roomCode,
      }
    );

    const { s3Key, presignedPutUrl } = uploadUrlRes.data;

    // Step 2: Upload file directly to S3 using presigned URL
    console.log('Uploading file to S3...', s3Key);

    //put req to aws s3 presigned url
    await axios.put(presignedPutUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });

    console.log('File uploaded to S3 successfully');
    return s3Key;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Upload failed:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to upload file'
      );
    }
    throw error;
  }
}

/**
 * Step 2: Confirm file upload in database
 * This saves file metadata so it can be accessed later
 */
export async function confirmFileUpload(
  s3Key: string,
  filename: string,
  filetype: string,
  filesize: number
): Promise<ConfirmUploadResponse> {
  try {
    console.log('Confirming file upload in database...');
    const response = await axios.post<ConfirmUploadResponse>(
      `${API_BASE_URL}/files/confirm`,
      {
        key: s3Key,
        filename: filename,
        filetype: filetype,
        filesize: filesize,
      }
    );

    console.log('File confirmed in database:', response.data.fileId);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Confirm failed:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to confirm file upload'
      );
    }
    throw error;
  }
}

/**
 * Step 3: Get presigned download URL for a file
 * This URL can be used to view/download the file
 */
export async function getFileDownloadUrl(s3Key: string): Promise<string> {
  try {
    console.log('Getting download URL...');
    const response = await axios.get<FileMetadataResponse>(
      `${API_BASE_URL}/files/get/${encodeURIComponent(s3Key)}`
    );

    console.log('Download URL received');
    return response.data.presignedGetUrl;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Get download URL failed:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to get download URL'
      );
    }
    throw error;
  }
}

/**
 * Complete file upload flow in one function
 * Returns file metadata needed for WebSocket broadcast
 */
export async function completeFileUpload(
  file: File,
  roomCode: string
): Promise<ConfirmUploadResponse> {
  try {
    // Step 1: Upload to S3
    const s3Key = await uploadFileToS3(file, roomCode);

    // Step 2: Confirm in database
    const fileMetadata = await confirmFileUpload(
      s3Key,
      file.name,
      file.type,
      file.size
    );

    return fileMetadata;
  } catch (error) {
    console.error('❌ Complete file upload failed:', error);
    throw error;
  }
}
