import React, { useState } from 'react';

interface FileUploadProps {
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number; // in bytes
}

export default function FileUpload({ 
  onUploadComplete, 
  onUploadError,
  maxFileSize = 5 * 1024 * 1024 // Default 5MB
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const selectedFile = e.target.files[0];
    
    // 1. Validate file type (PDF only)
    if (selectedFile.type !== 'application/pdf') {
      onUploadError?.('Only PDF files are allowed');
      return;
    }

    // 2. Validate file size
    if (selectedFile.size > maxFileSize) {
      onUploadError?.(`File size exceeds ${maxFileSize / (1024 * 1024)}MB limit`);
      return;
    }

    // 3. Set selected file
    setFile(selectedFile);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      
      // 1. Create FormData with selected file
      const formData = new FormData();
      formData.append('file', file);

      // 2. Send POST request to /api/upload
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          // 3. Handle upload progress
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.open('POST', '/api/upload', true);
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          onUploadComplete?.(response);
        } else {
          onUploadError?.(xhr.statusText || 'Upload failed');
        }
        setIsUploading(false);
      };

      xhr.onerror = () => {
        onUploadError?.('Network error during upload');
        setIsUploading(false);
      };

      xhr.send(formData);

    } catch (error) {
      // 4. Handle error responses
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    
    const droppedFile = e.dataTransfer.files[0];
    
    // Validate file type
    if (droppedFile.type !== 'application/pdf') {
      onUploadError?.('Only PDF files are allowed');
      return;
    }

    // Validate file size
    if (droppedFile.size > maxFileSize) {
      onUploadError?.(`File size exceeds ${maxFileSize / (1024 * 1024)}MB limit`);
      return;
    }

    setFile(droppedFile);
    setUploadProgress(0);
  };

  return (
    <div className="file-upload">
      {/* Drag & Drop area */}
      <div 
        className={`upload-area ${dragActive ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {file ? (
          <div className="file-info">
            <p>Selected file: {file.name}</p>
            <p>Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="upload-prompt">
            <p>Drag & drop a PDF file here, or click to select</p>
            <p>Max file size: {maxFileSize / (1024 * 1024)}MB</p>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        id="file-input"
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Upload button */}
      <button 
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="upload-button"
      >
        {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload PDF'}
      </button>

      {/* Progress bar */}
      {isUploading && (
        <div className="progress-container">
          <div 
            className="progress-bar"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}