interface UploadProgressProps {
  progress: number; // 0-100
  fileName: string;
  fileSize: number;
}

export const UploadProgress = ({ progress, fileName, fileSize }: UploadProgressProps) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-sm w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploading file...</h2>

        {/* File Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="font-medium text-gray-900 break-words mb-1">{fileName}</p>
          <p className="text-sm text-gray-500">{formatFileSize(fileSize)}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">{Math.floor(progress)}%</p>
        </div>

        {/* Status Text */}
        <p className="text-center text-sm text-gray-500">
          {progress === 100 ? 'Processing...' : 'Uploading to cloud...'}
        </p>
      </div>
    </div>
  );
};

export default UploadProgress;
