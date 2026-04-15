import { Download, X } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  videoUrl: string;
  fileName: string;
  isDownloading: boolean;
  onClose: () => void;
  onDownload: (e: React.MouseEvent<HTMLElement>) => void;
}

export const VideoModal = ({
  isOpen,
  videoUrl,
  fileName,
  isDownloading,
  onClose,
  onDownload,
}: VideoModalProps) => {
  if (!isOpen || !videoUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          src={videoUrl}
          controls
          className="max-w-full max-h-[90vh] object-contain select-none"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          controlsList="nodownload"
          autoPlay
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all"
        >
          <X size={24} className="text-white" />
        </button>

        {/* Download button in modal */}
        <button
          onClick={onDownload}
          className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all"
          title="Download"
        >
          {isDownloading ? (
            <div className="w-5 h-5 border-2 border-neutral-300 border-t-white rounded-full animate-spin" />
          ) : (
            <Download size={20} className="text-white" />
          )}
        </button>
      </div>
    </div>
  );
};
