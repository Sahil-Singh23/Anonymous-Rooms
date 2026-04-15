import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import Alert from './Alert';

interface FileInputProps {
  onFileSelect: (files: File[]) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  merged?: boolean;
}

export const FileInput = ({ onFileSelect, onCancel, isLoading = false, merged = false }: FileInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const showError = (message: string) => {
    setAlertMessage(message);
  };

  const closeAlert = () => {
    setAlertMessage('');
  };

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
  const MAX_FILES = 5;

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type not supported: ${file.type}`;
    }
    if (file.size > MAX_SIZE) {
      return `File size exceeds 25MB (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
    }
    return null;
  };

  const handleFileSelect = (files: File[]) => {
    if (files.length === 0) {
      showError('No files selected');
      return;
    }

    if (files.length > MAX_FILES) {
      showError(`Maximum ${MAX_FILES} files allowed (you selected ${files.length})`);
      return;
    }

    const validationErrors: string[] = [];
    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        validationErrors.push(`${file.name}: ${validationError}`);
      }
    }

    if (validationErrors.length > 0) {
      showError(validationErrors.join(' | '));
      return;
    }

    // Send all files
    onFileSelect(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files);
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

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleCancel = () => {
    closeAlert();
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
        multiple
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

      {alertMessage && (
        <Alert message={alertMessage} type="error" onClose={closeAlert} />
      )}
    </>
  );
};

export default FileInput;
