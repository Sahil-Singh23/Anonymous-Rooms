import apiClient from './apiClient';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  profilePicUrl?: string | null;
  totalRoomsJoined: number;
  createdAt: string;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  s3Key: string;
}

const profileService = {
  // Get authenticated user's profile
  getMyProfile: async (): Promise<UserProfile> => {
    const { data } = await apiClient.get('/profile/me');
    return data;
  },

  // Get presigned URL for profile picture upload
  getPresignedUrl: async (fileName: string, fileType: string, fileSize: number): Promise<PresignedUrlResponse> => {
    const { data } = await apiClient.post('/profile/upload-pic', {
      filename: fileName,
      filetype: fileType,
      filesize: fileSize,
    });
    return {
      presignedUrl: data.presignedPutUrl,
      s3Key: data.s3Key,
    };
  },

  // Confirm profile picture after upload
  confirmProfilePic: async (s3Key: string): Promise<UserProfile> => {
    const { data } = await apiClient.post('/profile/confirm-pic', {
      s3Key,
    });
    return data.user;
  },
};

export default profileService;
