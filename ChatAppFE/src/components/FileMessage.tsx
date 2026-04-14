import { Download} from 'lucide-react';
import { useState } from 'react';
import { getFileDownloadUrl } from '../services/fileUploadService';

interface FileMessageProps {
  fileName: string;
  fileSize: number;
  fileType: string;
  s3Key: string;
  isSelf: boolean;
  timestamp: number;
}

export const FileMessage = ({
  fileName,
  fileSize,
  fileType,
  s3Key,
  isSelf,
  timestamp,
}: FileMessageProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleDownload = async (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    try {
      setIsDownloading(true);
      const presignedUrl = await getFileDownloadUrl(s3Key);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = presignedUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return '🖼️';
    }
    if (type === 'application/pdf') {
      return '📄';
    }
    if (type.includes('word') || type.includes('document')) {
      return '📝';
    }
    if (type.includes('sheet') || type.includes('excel')) {
      return '📊';
    }
    if (type.startsWith('video/')) {
      return '🎥';
    }
    if (type === 'text/plain') {
      return '📃';
    }
    return '📎';
  };

  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-2`}>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={`max-w-xs px-4 py-3 rounded-lg transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
          isSelf
            ? 'bg-blue-500 text-white rounded-b-none'
            : 'bg-gray-200 text-gray-900 rounded-b-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getFileIcon(fileType)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium break-words text-sm">{fileName}</p>
            <p className={`text-xs ${isSelf ? 'text-blue-100' : 'text-gray-600'}`}>
              {formatFileSize(fileSize)}
            </p>
          </div>
          <Download size={16} className="flex-shrink-0" />
        </div>
        <div className={`text-xs mt-1 ${isSelf ? 'text-blue-100' : 'text-gray-500'}`}>
          {isDownloading ? 'Downloading...' : formatTime(timestamp)}
        </div>
      </button>
    </div>
  );
};

export default FileMessage;
