import { Download, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFileDownloadUrl, getFileViewUrl } from '../services/fileUploadService';

interface FileMessageProps {
  fileName: string;
  fileSize: number;
  fileType: string;
  s3Key: string;
  s3Url?: string;
  isSelf: boolean;
  timestamp: number;
}

export const FileMessage = ({
  fileName,
  fileSize,
  fileType,
  s3Key,
  s3Url,
  isSelf,
  timestamp,
}: FileMessageProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewUrl, setViewUrl] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const isImage = fileType.startsWith('image/');
  const isVideo = fileType.startsWith('video/');
  const isPreviewable = isImage || isVideo;

  // Fetch presigned URL for viewing images/videos
  useEffect(() => {
    if (isPreviewable) {
      getFileViewUrl(s3Key)
        .then(url => {
          setViewUrl(url);
          setLoadingPreview(false);
        })
        .catch(err => {
          console.error('Failed to get preview URL:', err);
          setPreviewError(true);
          setLoadingPreview(false);
        });
    }
  }, [s3Key, isPreviewable]);

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

  // Image preview
  if (isImage) {
    return (
      <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`relative w-56 h-56 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800`}>
          {loadingPreview ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-neutral-400 text-sm">Loading...</span>
            </div>
          ) : previewError || !viewUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-neutral-400 text-sm">❌ Preview unavailable</span>
            </div>
          ) : (
            <img
              src={viewUrl}
              alt={fileName}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => window.open(viewUrl, '_blank')}
            />
          )}
          
          {/* Download button - top left */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="absolute top-2 left-2 p-2 bg-black/50 hover:bg-black/70 rounded-full disabled:opacity-50 transition-all"
            title="Download"
          >
            <Download size={16} className="text-white" />
          </button>
          
          {/* Time and status - bottom left */}
          <div className="absolute bottom-2 left-2 text-white text-xs font-semibold">
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // Video preview
  if (isVideo) {
    return (
      <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`relative w-64 h-56 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800`}>
          {loadingPreview ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-neutral-400 text-sm">Loading...</span>
            </div>
          ) : previewError || !viewUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-neutral-400 text-sm">❌ Preview unavailable</span>
            </div>
          ) : (
            <video
              src={viewUrl}
              controls
              className="w-full h-full object-cover bg-black"
            />
          )}
          
          {/* Download button - top left */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="absolute top-2 left-2 p-2 bg-black/50 hover:bg-black/70 rounded-full disabled:opacity-50 transition-all z-10"
            title="Download"
          >
            <Download size={16} className="text-white" />
          </button>
          
          {/* Time - bottom left */}
          <div className="absolute bottom-2 left-2 text-white text-xs font-semibold z-10">
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // File card (for PDFs, docs, etc.)
  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`relative w-72 px-4 py-3 rounded-lg border border-neutral-700 ${
        isSelf ? 'bg-neutral-900' : 'bg-neutral-800'
      }`}>
        <div className="flex items-start gap-3 pb-2">
          {/* File Icon */}
          <div className="text-3xl flex-shrink-0 mt-1">{getFileIcon(fileType)}</div>
          
          {/* File Info - Center */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm break-words text-white">
              {fileName}
            </p>
            <p className="text-xs mt-0.5 text-neutral-400">
              {formatFileSize(fileSize)}
            </p>
          </div>
          
          {/* Download Button - Right */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-shrink-0 p-2 rounded-full transition-all disabled:opacity-50 hover:bg-neutral-700"
            title="Download"
          >
            <Download size={18} className="text-white" />
          </button>
        </div>
        
        {/* Time - Bottom Right */}
        <div className="text-xs text-right text-neutral-400">
          {isDownloading ? 'Downloading...' : formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
};

export default FileMessage;
