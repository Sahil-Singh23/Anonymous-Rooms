import { useState, useRef } from 'react';
import { User } from 'lucide-react';
import profileService from '../services/profileService';
import Alert from './Alert';

interface ProfilePictureUploadProps {
  currentPicUrl?: string | null;
  onSuccess: (newPicUrl: string) => void;
  onError?: (error: string) => void;
}

const ProfilePictureUpload = ({ currentPicUrl, onSuccess, onError }: ProfilePictureUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setAlertType('error');
      setAlertMessage('Only JPEG, PNG, and WebP images are allowed');
      setShowAlert(true);
      onError?.('Invalid file type');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      setAlertType('error');
      setAlertMessage(`File size must be less than 5MB. Your file is ${sizeMB}MB`);
      setShowAlert(true);
      onError?.('File too large');
      return;
    }

    try {
      setIsUploading(true);

      // Get presigned URL from backend
      const { presignedUrl, s3Key } = await profileService.getPresignedUrl(
        file.name,
        file.type,
        file.size
      );

      // Upload to S3 using presigned URL
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to S3');
      }

      // Confirm upload with backend
      const updatedProfile = await profileService.confirmProfilePic(s3Key);

      setAlertType('success');
      setAlertMessage('Profile picture updated successfully!');
      setShowAlert(true);

      // Call success callback with new URL
      onSuccess(updatedProfile.profilePicUrl || '');

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload profile picture';
      setAlertType('error');
      setAlertMessage(errorMessage);
      setShowAlert(true);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {showAlert && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}

      {/* Profile Picture Circle */}
      <div
        onClick={handleClick}
        className={`relative w-24 h-24 rounded-full border-2 border-neutral-600 overflow-hidden bg-neutral-900 flex items-center justify-center transition-all ${
          !isUploading ? 'cursor-pointer hover:opacity-80 hover:border-neutral-500' : 'cursor-not-allowed opacity-75'
        }`}
      >
        {currentPicUrl ? (
          <img
            src={currentPicUrl}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <User size={56} className="text-neutral-500" />
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 border-2 border-neutral-700 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-transparent border-t-[#FFFAED] rounded-full animate-spin"></div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleClick}
        disabled={isUploading}
        className={`px-4 py-2 rounded-lg font-sfmono text-sm font-medium transition-all ${
          isUploading
            ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
            : 'bg-[#FFFAED] text-[#14100B] hover:opacity-90'
        }`}
      >
        {isUploading ? 'Uploading...' : currentPicUrl ? 'Change Picture' : 'Upload Picture'}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
};

export default ProfilePictureUpload;
