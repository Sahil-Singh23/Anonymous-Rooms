import { useState, useRef } from 'react';
import { Plus, X } from 'lucide-react';

interface FileInputProps {
  onFileSelect: (file: File) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  merged?: boolean;
}

export const FileInput = ({ onFileSelect, onCancel, isLoading = false, merged = false }: FileInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

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

  const MAX_SIZE = 25 * 1024 * 1024; // 25MB

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type not supported: ${file.type}`;
    }
    if (file.size > MAX_SIZE) {
      return `File size exceeds 25MB (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setError('');
    setSelectedFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
      setSelectedFile(null);
      setError('');
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setError('');
    onCancel?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return '🖼️';
    }
    if (file.type === 'application/pdf') {
      return '📄';
    }
    if (file.type.includes('word') || file.type.includes('document')) {
      return '📝';
    }
    if (file.type.includes('sheet') || file.type.includes('excel')) {
      return '📊';
    }
    if (file.type.startsWith('video/')) {
      return '🎥';
    }
    if (file.type === 'text/plain') {
      return '📃';
    }
    return '📎';
  };

  // If file is selected, show preview
  if (selectedFile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-sm w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Send file?</h2>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* File Preview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{getFileIcon(selectedFile)}</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 wrap-break-wor">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // File input with drag-drop
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
        className="hidden"
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4,.webm"
        disabled={isLoading}
      />

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={`${merged ? 'p-3 text-white hover:text-[#beb59b] transition-colors disabled:opacity-50' : 'p-3 rounded-xl border border-solid border-[#444444] text-white hover:border-[#beb59b] transition-colors disabled:opacity-50'}`}
          title="Attach file"
        >
          <Plus size={20} />
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-500 mt-1">{error}</div>
      )}
    </>
  );
};

export default FileInput;
