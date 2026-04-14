import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';

interface FileInputProps {
  onFileSelect: (file: File) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  merged?: boolean;
}

export const FileInput = ({ onFileSelect, onCancel, isLoading = false, merged = false }: FileInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      return;
    }
    setError('');
    // Directly send the file without showing a confirmation modal
    onFileSelect(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const handleCancel = () => {
    setError('');
    onCancel?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
