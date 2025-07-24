'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useCloudinaryUpload } from '@/lib/hooks/useCloudinaryUpload';
import { validateFile, formatFileSize } from '@/lib/upload-utils';

interface FileUploadProps {
    onUploadSuccess?: (result: any) => void;
    onUploadError?: (error: string) => void;
    acceptedTypes?: 'image' | 'audio' | 'any';
    maxSizeInMB?: number;
    folder?: string;
    className?: string;
}

export default function FileUpload({
    onUploadSuccess,
    onUploadError,
    acceptedTypes = 'any',
    maxSizeInMB = 10,
    folder,
    className = '',
}: FileUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadFile, isUploading, error, result, progress, reset } = useCloudinaryUpload();

    const handleDragEnter = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileUpload = async (file: File) => {
        // Validate file
        const validation = validateFile(file, {
            allowedTypes: acceptedTypes,
            maxSizeInMB,
        });

        if (!validation.isValid) {
            const errorMessage = validation.errors.join(', ');
            onUploadError?.(errorMessage);
            return;
        }

        try {
            reset(); // Clear any previous errors
            const uploadResult = await uploadFile(file, {
                type: acceptedTypes !== 'any' ? acceptedTypes : 'auto',
                folder,
            });

            onUploadSuccess?.(uploadResult);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            onUploadError?.(errorMessage);
        }
    };

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    const getAcceptAttribute = () => {
        switch (acceptedTypes) {
            case 'image':
                return 'image/*';
            case 'audio':
                return 'audio/*';
            default:
                return '*/*';
        }
    };

    const getUploadText = () => {
        switch (acceptedTypes) {
            case 'image':
                return 'Upload images';
            case 'audio':
                return 'Upload audio files';
            default:
                return 'Upload files';
        }
    };

    return (
        <div className={`w-full ${className}`}>
            {/* Upload Area */}
            <div
                className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragOver
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={!isUploading ? openFileDialog : undefined}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={getAcceptAttribute()}
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                />

                {isUploading ? (
                    <div className="space-y-4">
                        <div className="text-lg font-medium text-gray-600">
                            Uploading... {progress}%
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-4xl">📁</div>
                        <div className="text-lg font-medium text-gray-600">
                            {getUploadText()}
                        </div>
                        <div className="text-sm text-gray-500">
                            Drag and drop files here, or click to select files
                        </div>
                        <div className="text-xs text-gray-400">
                            Max file size: {maxSizeInMB}MB
                        </div>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-red-600 text-sm font-medium">Upload Error</div>
                    <div className="text-red-500 text-sm">{error}</div>
                </div>
            )}

            {/* Success Display */}
            {result && !isUploading && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-green-600 text-sm font-medium mb-2">Upload Successful!</div>
                    <div className="space-y-2 text-sm">
                        <div><strong>Public ID:</strong> {result.public_id}</div>
                        <div><strong>Format:</strong> {result.format}</div>
                        <div><strong>Size:</strong> {formatFileSize(result.bytes)}</div>
                        {result.width && result.height && (
                            <div><strong>Dimensions:</strong> {result.width} × {result.height}</div>
                        )}
                        {result.duration && (
                            <div><strong>Duration:</strong> {Math.round(result.duration)}s</div>
                        )}
                        <div className="mt-2">
                            <a
                                href={result.secure_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm underline"
                            >
                                View uploaded file
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 