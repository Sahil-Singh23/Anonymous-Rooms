import { Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFileDownloadUrl, getFileViewUrl } from '../services/fileUploadService';
import { ImageModal } from './ImageModal';
import { VideoModal } from './VideoModal';
import Sent from '../icons/Sent';
import Sending from '../icons/Sending';

interface FileMessageProps {
  fileName: string;
  fileSize: number;
  fileType: string;
  s3Key: string;
  s3Url?: string;
  isSelf: boolean;
  timestamp: number;
  status?: 'sending' | 'sent' | 'failed';
}

export const FileMessage = ({
  fileName,
  fileSize,
  fileType,
  s3Key,
  s3Url,
  isSelf,
  timestamp,
  status = 'sent',
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
    // Only fetch preview if we have a real s3Key (not uploading)
    if (isPreviewable && status !== 'sending') {
      setPreviewError(false); // Clear previous errors
      setLoadingPreview(true);
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
  }, [s3Key, isPreviewable, status]);

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
      
      // Fetch the file as a blob to ensure download instead of opening in browser
      const response = await fetch(presignedUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }
      const blob = await response.blob();
      
      // Create a blob URL and download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
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
      <>
        <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-2`}>
          <div className={`relative w-56 h-56 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800`}>
            {status === 'sending' ? (
              <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                <span className="text-neutral-400 text-sm">Uploading...</span>
              </div>
            ) : loadingPreview ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-neutral-400 text-sm">Loading...</span>
              </div>
            ) : previewError || !viewUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-neutral-400 text-sm">Preview unavailable</span>
              </div>
            ) : (
              <img
                src={viewUrl}
                alt={fileName}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setShowModal(true)}
              />
            )}
            
            {/* Small loader badge during upload - top right corner */}
            {status === 'sending' && (
              <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full">
                <div className="w-4 h-4 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
              </div>
            )}
            
            {/* Download button - top left */}
            {status !== 'sending' && (
              <button
                onClick={handleDownload}
                className="absolute top-2 left-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all"
                title="Download"
              >
                {isDownloading ? (
                  <div className="w-4 h-4 border-2 border-neutral-300 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download size={16} className="text-white" />
                )}
              </button>
            )}
            
            {/* Time and status - bottom right */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <span className="text-[10px] font-sfmono opacity-50 text-white">{formatTime(timestamp)}</span>
              {isSelf && status && (
                status === 'sending' ? <Sending /> : <Sent />
              )}
            </div>
          </div>
        </div>

        <ImageModal
          isOpen={showModal}
          imageUrl={viewUrl}
          fileName={fileName}
          isDownloading={isDownloading}
          onClose={() => setShowModal(false)}
          onDownload={handleDownload}
        />
      </>
    );
  }

  // Video preview
  if (isVideo) {
    return (
      <>
        <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-2`}>
          <div className={`relative w-64 h-56 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800 ${status !== 'sending' ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`} onClick={() => status !== 'sending' && setShowModal(true)}>
            {status === 'sending' ? (
              <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                <span className="text-neutral-400 text-sm">Loading...</span>
              </div>
            ) : loadingPreview ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-neutral-400 text-sm">Loading...</span>
              </div>
            ) : previewError || !viewUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-neutral-400 text-sm"> Preview unavailable</span>
              </div>
            ) : (
              <video
                src={viewUrl}
                className="w-full h-full object-cover bg-black"
              />
            )}
            
            {/* Small loader badge during upload - top right corner */}
            {status === 'sending' && (
              <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full">
                <div className="w-4 h-4 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
              </div>
            )}
            
            {/* Download button - top left */}
            {status !== 'sending' && (
              <button
                onClick={handleDownload}
                className="absolute top-2 left-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all z-10"
                title="Download"
              >
                {isDownloading ? (
                  <div className="w-4 h-4 border-2 border-neutral-300 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download size={16} className="text-white" />
                )}
              </button>
            )}
            
            {/* Time and status - bottom right */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 z-10">
              <span className="text-[10px] font-sfmono opacity-50 text-white">{formatTime(timestamp)}</span>
              {isSelf && status && (
                status === 'sending' ? <Sending /> : <Sent />
              )}
            </div>
          </div>
        </div>

        <VideoModal
          isOpen={showModal}
          videoUrl={viewUrl}
          fileName={fileName}
          isDownloading={isDownloading}
          onClose={() => setShowModal(false)}
          onDownload={handleDownload}
        />
      </>
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
          
          {/* Small loader badge or download button - Right */}
          {status === 'sending' ? (
            <div className="flex-shrink-0 p-2 rounded-full">
              <div className="w-5 h-5 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <button
              onClick={handleDownload}
              className="flex-shrink-0 p-2 rounded-full transition-all hover:bg-neutral-700"
              title="Download"
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-neutral-300 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={18} className="text-white" />
              )}
            </button>
          )}
        </div>
        
        {/* Time - Bottom Right */}
        {/* Time and status - Bottom Right */}
        <div className="flex items-center justify-end gap-1">
          {status === 'sending' && <span className="text-[10px] font-sfmono text-neutral-400">Uploading...</span>}
          <span className="text-[10px] font-sfmono opacity-50 text-white">{formatTime(timestamp)}</span>
          {isSelf && status && (
            status === 'sending' ? <Sending /> : <Sent />
          )}
        </div>
      </div>
    </div>
  );
};

export default FileMessage;
